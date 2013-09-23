"use strict";

// jQluster factory object for generating RemoteSelector objects
// requires: jquery, util, remote_selector, transport, local_server

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var local_server;
    var myclass = my.RemoteSelectorFactory = function(args) {
        // @params: args.my_remote_id, args.transport_id, args.notify = []
        var doc_factories;
        if(!my.defined(args.my_remote_id)) {
            throw "my_remote_id parameter is mandatory";
        }
        if(!my.defined(args.transport_id)) {
            throw "transport_id parameter is mandatory";
        }
        if(!my.defined(args.notify)) args.notify = [];
        if(!$.isArray(args.notify)) args.notify = [args.notify];
        
        this.transport = myclass._createTransport(args.my_remote_id, args.transport_id);
        this.notify_listeners_for = {};
        this.notified_dict = {};
        
        doc_factories = $(document).data("jqluster-factories") || {};
        doc_factories[args.my_remote_id] = this;
        $(document).data("jqluster-factories", doc_factories);

        this._notify(args.notify);
    };
    myclass._createTransport = function(my_remote_id, transport_id) {
        return new my.Transport({
            remote_id: my_remote_id,
            connection_object: myclass._createConnection(transport_id)
        });
    };
    myclass._createConnection = function(transport_id) {
        if(transport_id === "local") {
            if(!local_server) {
                local_server = new my.ServerLocal();
            }
            return new my.ConnectionLocal(local_server);
        }else if(transport_id.match(/^wss?:\/\//)) {
            return new my.ConnectionWebSocket(transport_id);
        }
        throw "Unknown transport_id: " + transport_id;
    };
    myclass.releaseLocalServer = function() {
        local_server = undefined;
    };
    myclass.releaseFactories = function() {
        $(document).data("jqluster-factories", {});
    };
    myclass.prototype = {
        _createRemoteSelector: function(remote_id, target) {
            var self = this;
            var args = {
                transport: self.transport,
                remote_id: remote_id,
            };
            if(target === window) {
                args.eval_code = "$(window)";
            }else if(target === document) {
                args.eval_code = "$(document)";
            }else if($.isPlainObject(target) && my.defined(target.remote_type)) {
                // if target is a remote DOM Pointer object...
                if(target.remote_type === "xpath") {
                    args.xpath = target.remote_xpath;
                    if(my.defined(target.remote_id)) {
                        args.remote_id = target.remote_id;
                    }
                }else {
                    throw "Unknown remote pointer type: " + target.remote_type;
                }
            }else {
                args.selector = "" + target;
            }
            return new my.RemoteSelector(args);
        },
        _checkIfRemoteAvailable: function(remote_id) {
            // @return: promise, resolved if the remote is available, rejected if not.
            var self = this;
            var result_d = $.Deferred();
            self.transport.selectAndGet({
                remote_id: remote_id,
                eval_code: '$(document).data("jqluster-factories")['+ my.quoteString(remote_id) +'].isNotifying('
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
        _listenToRemoteReadiness: function(remote_id, callback, factory_func) {
            var self = this;
            var wrapped_callback = function() { callback(factory_func) };
            if(!self.notify_listeners_for[remote_id]) {
                self.notify_listeners_for[remote_id] = [];
            }
            self.notify_listeners_for[remote_id].push(wrapped_callback);
            self._checkIfRemoteAvailable(remote_id).then(function() {
                wrapped_callback();
            });
        },
        forRemote: function(remote_id, immediate_target) {
            var self = this;
            var factory = function(target) {
                if($.isFunction(target)) {
                    self._listenToRemoteReadiness(remote_id, target, factory);
                }else {
                    return self._createRemoteSelector(remote_id, target);
                }
            };
            if(my.defined(immediate_target)) {
                return factory(immediate_target);
            }else {
                return factory;
            }
        },
        _notify: function(notified_remote_id_array) {
            var self = this;
            $.each(notified_remote_id_array, function(i, notified_remote_id) {
                self.notified_dict[notified_remote_id] = true;
                self.transport.selectAndGet({
                    remote_id: notified_remote_id,
                    eval_code: '$(document).data("jqluster-factories")['+ my.quoteString(notified_remote_id) +'].beNotified('
                               + my.quoteString(self.transport.getMyRemoteID()) +')'
                });
            });
        },
        isNotifying: function(notified_remote_id) {
            // @return: true if this Factory notifies its readiness to notified_remote_id. false otherwise.
            return this.notified_dict[notified_remote_id] || false;
        },
        beNotified: function(from_remote_id) {
            var self = this;
            var listeners = self.notify_listeners_for[from_remote_id];
            if(!listeners) return;
            $.each(listeners, function(i, callback) {
                callback();
            });
        },
    };
})(jQluster, jQuery);

