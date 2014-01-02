"use strict";

/**
 * @file
 * @author Toshio Ito
 */

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var local_server;
    /**
     * @class
     * @alias jQluster.RemoteSelectorFactory
     *
     * @classdesc This class is a factory object for {@link
     * jQluster.RemoteSelector}s. It generates RemoteSelectors with a
     * certain transport specified by a string (transport ID).
     *
     * The following is the list of possible transport IDs.
     *
     * - WebSocket URL (e.g. "ws://example.com/jqluster")
     *     - It connects to a jQluster server via a WebSocket.
     * - "loopback"
     *     - It generates RemoteSelectors that always target to the local node.
     * - "local"
     *     - It connects to a jQluster server within the local node.
     *
     * @example
     * var factory_on_alice = new jQluster.RemoteSelectorFactory({
     *     node_id: "Alice",
     *     transport_id: "ws://example.com/jqluster",
     *     notify: ["Bob"]
     * });
     * 
     * var generator_for_bob = factory_on_alice.forRemoteNode("Bob");
     * 
     * var remote_selector = generator_for_bob("#some-button");
     * 
     * generator_for_bob(function(arg) {
     *     // The callback called when Bob is ready.
     *     // arg === generator_for_bob
     *     console.log("Bob is ready. I know it.");
     *     remote_selector.addClass("activated");
     * });
     * 
     * factory_on_alice.forRemoteNode("Charlie", function(generator_for_charlie) {
     *     // The callback called when Charlie is ready.
     *     generator_for_charlie("#some-box").text("Now Charlie is ready.");
     * });
     *
     * @requires jQuery
     * @requires util.js
     * @requires RemoteSelector.js
     * @requires Transport.js
     * @requires ServerLocal.js
     * @requires ConnectionLocal.js
     * @requires TransportLoopback.js
     * @requires ReadinessCallbackManager.js
     * @requires ReadinessCallbackManagerLoopback.js
     *
     * @param {string} args.node_id - The Node ID of the local node.
     *
     * @param {string} args.transport_id - A string that specifies the
     * transport to be used.
     *
     * @param {string[]} [args.notify=[]] - A list of Node ID strings
     * that it notifies of its readiness.
     * @see {@link jQluster.ReadinessCallbackManager}
     */
    var myclass = my.RemoteSelectorFactory = function(args) {
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
        /**
         * @callback jQluster.RemoteSelectorFactory~ReadinessCallback
         *
         * @param {jQluster.RemoteSelectorFactory} factory - the
         * factory object it belongs to.
         *
         * @desc A callback function that is called when the specified
         * remote node is ready for jQluster.
         */
        /**
         * @typedef {function} jQluster.RemoteSelectorFactory~Generator
         *
         * @param
         * {string|jQluster.RemoteSelectorFactory~ReadinessCallback}
         * target - If string, it is interpreted as a jQuery selector
         * string. If function, it is interpreted as a callback
         * function that is called when the remote node is ready for
         * jQluster.
         *
         * @returns {jQluster.RemoteSelector|nothing} A RemoteSelector
         * if the `target` is a selector string. Nothing otherwise.
         *
         * @desc A generator of {@link jQluster.RemoteSelector}s that
         * is tied to a specific node.
         */
        /**
         * Create a function that generates {@link
         * jQluster.RemoteSelector}s on the specified remote Node.
         *
         * @param {string} remote_node_id - The target remote Node ID.
         *
         * @param
         * {string|jQluster.RemoteSelectorFactory~ReadinessCallback}
         * [immediate_target=undefined] - If set, it is equivalent to
         * `forRemoteNode(remote_node_id)(immediate_target)`.
         *
         * @returns {jQluster.RemoteSelectorFactory~Generator|any} If
         * `immediate_target` is not specified, it returns a generator
         * function of RemoteSelectors.
         */
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
        /**
         * Safely releases the resource it keeps.
         * @returns nothing.
         */
        release: function() {
            if(my.defined(this.transport)) {
                this.transport.release();
                this.transport = null;
            }
            this.readiness_callback_manager = null;
        },
    };
})(jQluster, jQuery);

