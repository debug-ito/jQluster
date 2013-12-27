"use strict";

/**
 * @file
 * @author Toshio Ito
 */

if(!jQluster) { var jQluster = {}; }


(function(my, $) {
    /**
     * @class
     * @alias jQluster.Transport
     * @classdesc jQluster.Transport represents a jQluster node. It
     * abstracts jQluster messaging protocol.
     *
     * It uses a jQluster.Connection object to send and receive
     * messages to/from other nodes. It handles messages it receives
     * and executes what they demand (although maybe this function
     * should be refactored into another class).
     *
     * @requires jQuery
     * @requires jQuery.xpath
     * @requires util.js
     *
     * @todo Design and implement some mechanism for node grouping. In
     * the current implementation, it is possible for multiple nodes
     * to have the same ID. However, in this case there is no way to
     * distinguish individual nodes with that ID. With a proper
     * grouping mechanism, the user would be able to multi-cast a
     * message (e.g. a 'select_and_listen' message) and still
     * distinguish individual node in the group (e.g. the exact node
     * that sends a 'signal' message).
     *
     * @example
     * var alice = new jQluster.Transport({
     *     node_id: "Alice",
     *     connection_object: new jQluster.ConnectionWebSocket("ws://example.com/jqluster/server")
     * });
     *
     * console.log("I'm " + alice.getNodeID());   // => I'm Alice
     * 
     * alice.selectAndGet({node_id: "Bob", eval_code: "1 + 10"}).then(function(result) {
     *     console.log("result: " + result);  // => result: 11
     * }, function(error) {
     *     console.error(error);
     * });
     * 
     * alice.selectAndListen({
     *     node_id: "Bob", eval_code: "$('#some-button')",
     *     method: "on", options: ["click"],
     *     callback: function() {
     *         console.log("some-button is clicked.");
     *         console.log(this); // => a RemoteDOMPointer object pointing #some-button
     *     }
     * });
     *
     * @param {string} args.node_id - Node ID of this transport.
     * @param {jQluster.Connection} args.connection_object - the underlying Connection object.
     */
    var myclass = my.Transport = function(args) {
        var self = this;
        if(!my.defined(args.node_id)) {
            throw "node_id param is mandatory";
        }
        if(!my.defined(args.connection_object)) {
            throw "connection_object param is mandatory";
        }
        self.node_id = args.node_id;
        self.connection_object = args.connection_object;
        self.pending_request_for = {};
        self.signal_callback_for = {};
        
        self.connection_object.onReceive(function(message) { self._onReceive(message); });
        self.connection_object.send({
            message_id: my.uuid(), message_type: "register",
            from: self.node_id, to: null,
            body: { node_id: self.node_id }
        });
    };
    myclass.prototype = {
        /** @returns {string} Node ID of this transport. */
        getNodeID: function() { return this.node_id; },

        /**
         * Execute the given code and get the result from a remote
         * Node.
         *
         * @param {string} args.node_id - the Node ID of the remote Node.
         * @param {string} args.eval_code - the JavaScript code that
         * is evaluated on the remote node.
         *
         * @returns {jQuery.Promise} In success, the promise is
         * resolved and it contains the obtained data. In failure it
         * is rejected and it contains the cause of the error.
         * 
         * If the remote node does not exist, the returned Promise
         * will be rejected.
         * 
         * If there are multiple remote nodes, the caller will receive
         * the result returned by one of the remote nodes, but it is
         * not defined exactly which remote node is used.
         */
        selectAndGet: function(args) {
            var self = this;
            var response_d = $.Deferred();
            try {
                if(!my.defined(args.eval_code)) {
                    throw "eval_code param is mandatory";
                }
                if(!my.defined(args.node_id)) {
                    throw "node_id param is mandatory";
                }
                var message = {
                    message_id: my.uuid(), message_type: "select_and_get",
                    from: self.node_id, to: args.node_id,
                    body: { eval_code: args.eval_code, node_id: args.node_id }
                };
                self.pending_request_for[message.message_id] = response_d;
                self.connection_object.send(message);
            }catch(e) {
                response_d.reject(e);
            }
            return response_d.promise();
        },

        /**
         * Select a jQuery object on a remote Node and register a
         * callback on it. With this method you can listen to events
         * that occur on the remote Node.
         *
         * @param {string} args.node_id - the remote Node ID.
         *
         * @param {string} args.eval_code - the JavaScript code that
         * is executed on the remote Node. It must return jQuery
         * object.
         *
         * @param {string} args.method - the name of the method called
         * on the jQuery object that "args.eval_code" returns. The
         * method must accept a callback function as its last
         * argument.
         *
         * @param {Array} [args.options=[]] - arguments for the
         * "args.method" other than the callback.
         *
         * @param {function} args.callback - the callback function
         * that is called when an event on the remote Node occurs.
         *
         * Arguments for the args.callback is exact copy of the
         * arguments for the remote callback, except that DOM elements
         * are converted to {@link jQluster.Transport~RemoteDOMPointer}
         * objects. 'this' object for args.callback is the copy of
         * 'this' object for the remote callback. It may be a
         * {@link jQluster.Transport~RemoteDOMPointer} object, too.
         *
         * @returns {jQuery.Promise} the promise will be resolved if
         * the request is accepted by the remote node. The content of
         * the promise is meaningless in this case. In failure, it
         * will be rejected and it contains the cause of the error.
         * 
         * If the remote node does not exist, the resulting Promise
         * will be rejected.
         * 
         * If there are multiple remote nodes, all of them receive the
         * listen request. In this case, the resulting Promise
         * reflects one of the responses from those remote nodes, but
         * there is no guarantee on exactly which response is used to
         * affect the Promise.
         *
         * @todo About remote signal handler: For now there is no way
         * to REMOVE callbacks.  So, **calling selectAndListen() over
         * and over can cause memory leak**.  We need a way to remove
         * callbacks registered by this method.
         */
        selectAndListen: function(args) {
            var self = this;
            var result_d = $.Deferred();
            var message, callback;
            try {
                $.each(["node_id", "eval_code", "method", "callback"], function(i, mandatory_key) {
                    if(!my.defined(args[mandatory_key])) {
                        throw mandatory_key + " param is mandatory";
                    }
                });
                callback = args.callback;
                if(!my.defined(args.options)) args.options = [];
                message = {
                    message_id: my.uuid(), message_type: "select_and_listen",
                    from: self.node_id, to: args.node_id,
                    body: {
                        node_id: args.node_id, eval_code: args.eval_code, 
                        method: args.method, options: args.options
                    }
                };
                result_d.promise().then(function() {
                    self.signal_callback_for[message.message_id] = function(callback_this, callback_args) {
                        callback.apply(callback_this, callback_args);
                    };
                });
                self.pending_request_for[message.message_id] = result_d;
                self.connection_object.send(message);
            }catch(e) {
                result_d.reject(e);
            }
            return result_d.promise();
        },

        /**
         * Call this method when you receive a message.
         * @private
         * @param {jQluster.Connection~Message} message - the received message.
         * @returns nothing
         */
        _onReceive: function(message) {
            var self = this;
            if(message.to !== self.node_id) {
                console.debug("A message whose 'to' field is "+ (defined(message.to) ? message.to : "[null]")
                              + " is received but ignored because I'm "+ self.node_id);
                return;
            }
            if(message.message_type === "signal") {
                self._processSignal(message);
            }else if(my.defined(message.body.in_reply_to)) {
                self._onReply(message.body.in_reply_to, message);
            }else if(message.message_type === "select_and_get") {
                self._processSelectAndGet(message);
            }else if(message.message_type === "select_and_listen") {
                self._processSelectAndListen(message);
            }else {
                console.error("Unknown message received but discarded.");
                console.error(message);
            }
        },

        _KNOWN_REPLY_MESSAGE_TYPE: {
            select_and_get_reply: 1,
            select_and_listen_reply: 1
        },
        _onReply: function(in_reply_to, message) {
            var self = this;
            var pending_d = self.pending_request_for[in_reply_to];
            if(!my.defined(pending_d)) {
                return;
            }
            delete self.pending_request_for[in_reply_to];
            if(my.defined(self._KNOWN_REPLY_MESSAGE_TYPE[message.message_type])) {
                if(my.defined(message.body.error)) {
                    pending_d.reject(message.message_type + " error: " + message.body.error);
                }else {
                    pending_d.resolve(message.body.result);
                }
            }else {
                pending_d.reject("unkown message type: " + message.message_type);
            }
        },

        _processSelectAndGet: function(request_message) {
            var self = this;
            var result_p = null;
            try {
                result_p = $.when(eval(request_message.body.eval_code));
            }catch(e) {
                result_p = $.Deferred();
                result_p.reject(e);
            }
            var reply = {
                message_id: my.uuid(), message_type: "select_and_get_reply",
                from: self.node_id, to: request_message.from,
                body: { "error": null,  "result": null, "in_reply_to": request_message.message_id}
            };
            result_p.then(function(result) {
                reply.body.result = result;
            }, function(error) {
                reply.body.error = error;
            }).always(function() {
                self.connection_object.send(reply);
            });
        },

        _processSignal: function(message) {
            var self = this;
            if(my.defined(message.error)) {
                console.error("signal message error:");
                console.error(message);
                return;
            }
            var callback = self.signal_callback_for[message.body.in_reply_to];
            if(!my.defined(callback)) {
                return;
            }
            callback(message.body.callback_this, message.body.callback_args);
        },

        /**
         * An object that points to a DOM object on a remote Node.
         * @typedef {Object} jQluster.Transport~RemoteDOMPointer
         * @see doc/protocol.md in jQluster package
         */
        
        _createRemoteDOMPointerIfDOM: function(obj) {
            if(my.isHTMLElement(obj)) {
               return {
                   remote_node_id: this.node_id,
                   remote_type: "xpath",
                   remote_xpath: my.xpathFor($(obj))
               };
            }else {
                return obj;
            }
        },

        _processSelectAndListen: function(message) {
            var self = this;
            var jq_node;
            var args_for_method;
            var request_id = message.message_id;
            var request_from = message.from;
            var reply_sent = false;
            var try_send_reply = function(error) {
                if(reply_sent) return;
                reply_sent = true;
                self.connection_object.send({
                    message_id: my.uuid(), message_type: "select_and_listen_reply",
                    from: self.node_id, to: request_from,
                    body: {error: error, result: (my.defined(error) ? null : "OK"), in_reply_to: request_id}
                });
            };
            try {
                jq_node = eval(message.body.eval_code);
                args_for_method = message.body.options;
                args_for_method.push(function() {
                    var callback_this = self._createRemoteDOMPointerIfDOM(this);
                    var callback_args = [];
                    var i;
                    for(i = 0 ; i < arguments.length ; i++) {
                        callback_args.push(self._createRemoteDOMPointerIfDOM(arguments[i]));
                    }
                    try_send_reply(null);
                    self.connection_object.send({
                        message_id: my.uuid(), message_type: "signal",
                        from: self.node_id, to: request_from,
                        body: { error: null, in_reply_to: request_id,
                                callback_this: callback_this, callback_args: callback_args}
                    });
                });
                jq_node[message.body.method].apply(jq_node, args_for_method);
                try_send_reply(null);
            }catch(e) {
                try_send_reply("_processSelectAndListen error: " + e);
            }
        },

        /**
         * Safely release the resource that this Transport has.
         * @returns nothing
         */
        release: function() {
            if(my.defined(this.connection_object)) {
                this.connection_object.release();
            }
            this.connection_object = null;
            this.pending_request_for = {};
            this.signal_callback_for = {};
        }
    };
    
})(jQluster, jQuery);
