"use strict";

// jQluster factory object for generating RemoteSelector objects
// requires: jquery, util, remote_selector, transport, local_server, transport_loopback, readiness_callback_manager

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var local_server;
    var myclass = my.RemoteSelectorFactory = function(args) {
        // @params: args.my_remote_id, args.transport_id, args.notify = []
        if(!my.defined(args.my_remote_id)) {
            throw "my_remote_id parameter is mandatory";
        }
        if(!my.defined(args.transport_id)) {
            throw "transport_id parameter is mandatory";
        }
        this.transport = myclass._createTransport(args.my_remote_id, args.transport_id);
        if(args.transport_id === "loopback") {
            this.readiness_callback_manager = new my.ReadinessCallbackManagerLoopback({
                transport: this.transport
            });
        }else {
            this.readiness_callback_manager = new my.ReadinessCallbackManager({
                transport: this.transport, notify: args.notify
            });
        }
    };
    myclass._createTransport = function(my_remote_id, transport_id) {
        if(transport_id === "loopback") {
            return new my.TransportLoopback();
        }else {
            return new my.Transport({
                my_remote_id: my_remote_id,
                connection_object: myclass._createConnection(transport_id)
            });
        }
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
        forRemote: function(remote_id, immediate_target) {
            var self = this;
            var factory = function(target) {
                if($.isFunction(target)) {
                    self.readiness_callback_manager.listenToRemoteReadiness(
                        remote_id, function() { target(factory); }
                    );
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
    };
})(jQluster, jQuery);

