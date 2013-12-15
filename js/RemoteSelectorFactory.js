"use strict";

// jQluster factory object for generating RemoteSelector objects
// requires: jquery, util, RemoteSelector, Transport, ServerLocal, ConnectionLocal
//           TransportLoopback, ReadinessCallbackManager, ReadinessCallbackManagerLoopback

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var local_server;
    var myclass = my.RemoteSelectorFactory = function(args) {
        // @params: args.node_id, args.transport_id, args.notify = []
        if(!my.defined(args.node_id)) {
            throw "node_id parameter is mandatory";
        }
        if(!my.defined(args.transport_id)) {
            throw "transport_id parameter is mandatory";
        }
        this.transport = myclass._createTransport(args.node_id, args.transport_id);
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
    myclass._createTransport = function(node_id, transport_id) {
        if(transport_id === "loopback") {
            return new my.TransportLoopback();
        }else {
            return new my.Transport({
                node_id: node_id,
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
        if(my.defined(local_server)) {
            local_server.release();
        }
        local_server = undefined;
    };
    myclass.prototype = {
        _createRemoteSelector: function(remote_node_id, target) {
            var self = this;
            var args = {
                transport: self.transport,
                node_id: remote_node_id,
            };
            if(target === window) {
                args.eval_code = "$(window)";
            }else if(target === document) {
                args.eval_code = "$(document)";
            }else if($.isPlainObject(target) && my.defined(target.remote_type)) {
                // if target is a remote DOM Pointer object...
                if(target.remote_type === "xpath") {
                    args.xpath = target.remote_xpath;
                    if(my.defined(target.remote_node_id)) {
                        args.node_id = target.remote_node_id;
                    }
                }else {
                    throw "Unknown remote pointer type: " + target.remote_type;
                }
            }else {
                args.selector = "" + target;
            }
            return new my.RemoteSelector(args);
        },
        forRemoteNode: function(remote_node_id, immediate_target) {
            var self = this;
            var factory = function(target) {
                if($.isFunction(target)) {
                    self.readiness_callback_manager.listenToRemoteReadiness(
                        remote_node_id, function() { target(factory); }
                    );
                }else {
                    return self._createRemoteSelector(remote_node_id, target);
                }
            };
            if(my.defined(immediate_target)) {
                return factory(immediate_target);
            }else {
                return factory;
            }
        },
        release: function() {
            if(my.defined(this.transport)) {
                this.transport.release();
                this.transport = null;
            }
            this.readiness_callback_manager = null;
        },
    };
})(jQluster, jQuery);

