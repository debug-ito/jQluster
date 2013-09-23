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
        doc_factories[self.transport.getMyRemoteID()] = self;
        $(document).data("jqluster-readiness-callback-managers", doc_factories);

        self._notify(args.notify);
    };
    myclass.release = function() {
        $(document).data("jqluster-readiness-callback-managers", {});
    };
    myclass.prototype = {
        _notify: function(notified_remote_id_array) {
            var self = this;
            $.each(notified_remote_id_array, function(i, notified_remote_id) {
                self.notified_dict[notified_remote_id] = true;
                self.transport.selectAndGet({
                    remote_id: notified_remote_id,
                    eval_code: '$(document).data("jqluster-readiness-callback-managers")['+ my.quoteString(notified_remote_id) +']._beNotified('
                        + my.quoteString(self.transport.getMyRemoteID()) +')'
                });
            });
        },
        _isNotifying: function(notified_remote_id) {
            // @return: true if this Factory notifies its readiness to notified_remote_id. false otherwise.
            return this.notified_dict[notified_remote_id] || false;
        },
        _beNotified: function(from_remote_id) {
            var self = this;
            var listeners = self.notify_listeners_for[from_remote_id];
            if(!listeners) return;
            $.each(listeners, function(i, callback) {
                callback();
            });
        },
        _checkIfRemoteAvailable: function(remote_id) {
            // @return: promise, resolved if the remote is available, rejected if not.
            var self = this;
            var result_d = $.Deferred();
            self.transport.selectAndGet({
                remote_id: remote_id,
                eval_code: '$(document).data("jqluster-readiness-callback-managers")['+ my.quoteString(remote_id) +']._isNotifying('
                    + my.quoteString(self.transport.getMyRemoteID()) +')'
            }).then(function(does_remote_notify_you) {
                if(does_remote_notify_you) {
                    result_d.resolve();
                }else {
                    result_d.reject("remote node exists, but it does not notify you.");
                }
            }, function() {
                result_d.reject("remote node does not exist or network error.");
            });
            return result_d.promise();
        },
        listenToRemoteReadiness: function(remote_id, callback) {
            // @return nothing
            var self = this;
            if(!self.notify_listeners_for[remote_id]) {
                self.notify_listeners_for[remote_id] = [];
            }
            self.notify_listeners_for[remote_id].push(callback);
            self._checkIfRemoteAvailable(remote_id).then(function() {
                callback();
            });
        },
    };
})(jQluster, jQuery);

(function(my, $) {
    var superclass = my.ReadinessCallbackManager;
    var myclass = my.ReadinessCallbackManagerLoopback = function(args) {
        // @params: args.transport
        if(!args) args = {};
        if(!my.defined(args.transport)) {
            throw "transport parameter is mandatory";
        }
        args.notify = [args.transport.getMyRemoteID()];
        superclass.call(this, args);
    };
    myclass.prototype = $.extend({}, superclass.prototype, {
        listenToRemoteReadiness: function(remote_id, callback) {
            return superclass.prototype.listenToRemoteReadiness.call(this, this.transport.getMyRemoteID(), callback);
        },
    });
})(jQluster, jQuery);
