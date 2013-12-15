"use strict";

// jQluster readiness callback manager
// requires: jquery, util

if(!jQluster) { jQluster = {}; }

(function(my, $) {
    var myclass = my.ReadinessCallbackManager = function(args) {
        // @params: args.transport, args.notify = []
        var self = this;
        var doc_factories;
        if(!my.defined(args.transport)) {
            throw "transport parameter is mandatory";
        }
        if(!my.defined(args.notify)) args.notify = [];
        if(!$.isArray(args.notify)) args.notify = [args.notify];

        self.transport = args.transport;
        self.notify_listeners_for = {};
        self.notified_dict = {};
        
        doc_factories = $(document).data("jqluster-readiness-callback-managers") || {};
        doc_factories[self.transport.getNodeID()] = self;
        $(document).data("jqluster-readiness-callback-managers", doc_factories);

        self._notify(args.notify);
    };
    myclass.release = function() {
        $(document).data("jqluster-readiness-callback-managers", {});
    };
    myclass.prototype = {
        _notify: function(notified_node_id_array) {
            var self = this;
            $.each(notified_node_id_array, function(i, notified_node_id) {
                self.notified_dict[notified_node_id] = true;
                self.transport.selectAndGet({
                    node_id: notified_node_id,
                    eval_code: '$(document).data("jqluster-readiness-callback-managers")['+ my.quoteString(notified_node_id) +']._beNotified('
                        + my.quoteString(self.transport.getNodeID()) +')'
                });
            });
        },
        _isNotifying: function(notified_node_id) {
            // @return: true if this Factory notifies its readiness to notified_node_id. false otherwise.
            return this.notified_dict[notified_node_id] || false;
        },
        _beNotified: function(from_node_id) {
            var self = this;
            var listeners = self.notify_listeners_for[from_node_id];
            if(!listeners) return;
            $.each(listeners, function(i, callback) {
                callback();
            });
        },
        _checkIfRemoteNodeAvailable: function(node_id) {
            // @return: promise, resolved if the remote node is available, rejected if not.
            var self = this;
            var result_d = $.Deferred();
            self.transport.selectAndGet({
                node_id: node_id,
                eval_code: '$(document).data("jqluster-readiness-callback-managers")['+ my.quoteString(node_id) +']._isNotifying('
                    + my.quoteString(self.transport.getNodeID()) +')'
            }).then(function(does_remote_node_notify_you) {
                if(does_remote_node_notify_you) {
                    result_d.resolve();
                }else {
                    result_d.reject("remote node exists, but it does not notify you.");
                }
            }, function() {
                result_d.reject("remote node does not exist or network error.");
            });
            return result_d.promise();
        },
        listenToRemoteReadiness: function(node_id, callback) {
            // @return nothing
            var self = this;
            if(!self.notify_listeners_for[node_id]) {
                self.notify_listeners_for[node_id] = [];
            }
            self.notify_listeners_for[node_id].push(callback);
            self._checkIfRemoteNodeAvailable(node_id).then(function() {
                callback();
            });
        },
    };
})(jQluster, jQuery);
