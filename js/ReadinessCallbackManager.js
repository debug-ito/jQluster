"use strict";

/**
 * @file
 * @author Toshio Ito
 */

if(!jQluster) { jQluster = {}; }

(function(my, $) {
    /**
     * @class
     * @alias jQluster.ReadinessCallbackManager
     *
     * @classdesc This class manages "readiness callbacks", callback
     * functions that are called when certain remote nodes are ready
     * for jQluster operations.
     *
     * You cannot listen to arbitrary remote nodes. If you want to
     * know a remote node's readiness, the remote node must notify
     * you. This is done by setting `notify` constructor argument of
     * the remote node's ReadinessCallbackManager.
     *
     * @requires jQuery
     * @requires util.js
     * @requires Transport.js
     *
     * @param {jQluster.Transport} args.transport - the Transport
     * object for the local node.
     *
     * @param {string[]} [args.notify=[]] - the list of remote
     * Node IDs that this manager notifies of its readiness.
     *
     */
    var myclass = my.ReadinessCallbackManager = function(args) {
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
        /**
         * @private
         * @returns true if this manager notifies its readiness to notified_node_id. false otherwise.
         */
        _isNotifying: function(notified_node_id) {
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
        /**
         * @private
         * @returns a promise, resolved if the remote node is available, rejected if not.
         */
        _checkIfRemoteNodeAvailable: function(node_id) {
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
        /**
         * Listen to a remote node for its readiness.
         *
         * Note that the `callback` is called immediately if the
         * remote node is already ready. After that, the `callback`
         * will be called every time the remote node gets ready (this
         * happens more than once if the remote node page is reloaded)
         *
         * @param {string} node_id - Node ID of the remote node.
         * @param {function} callback - the readiness callback function.
         * @returns nothing
         */
        listenToRemoteReadiness: function(node_id, callback) {
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
