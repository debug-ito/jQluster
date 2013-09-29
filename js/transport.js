"use strict";

// jQluster Transport object
// requires: jquery, jquery.xpath, util.js

if(!jQluster) { var jQluster = {}; }


(function(my, $) {
    var myclass;

    // TODO: Design and implement some mechanism for node grouping. In
    // the current implementation, it is possible for multiple nodes
    // to have the same ID. However, in this case there is no way to
    // distinguish individual nodes with that ID. With a proper
    // grouping mechanism, the user would be able to multi-cast a
    // message (e.g. a 'select_and_listen' message) and still
    // distinguish individual node in the group (e.g. the exact node
    // that sends a 'signal' message).
    
    myclass = my.Transport = function(args) {
        var self = this;
        // @params: args.my_remote_id, args.connection_object
        if(!my.defined(args.my_remote_id)) {
            throw "my_remote_id param is mandatory";
        }
        if(!my.defined(args.connection_object)) {
            throw "connection_object param is mandatory";
        }
        self.my_remote_id = args.my_remote_id;
        self.connection_object = args.connection_object;
        self.pending_request_for = {};
        self.signal_callback_for = {};
        
        self.connection_object.onReceive(function(message) { self._onReceive(message); });
        self.connection_object.send({
            message_id: my.uuid(), message_type: "register",
            from: self.my_remote_id, to: null,
            body: { remote_id: self.my_remote_id }
        });
    };
    myclass.prototype = {
        getMyRemoteID: function() { return this.my_remote_id; },
        selectAndGet: function(args) {
            // @params: args.eval_code, args.remote_id
            // 
            // @return: Promise. In success, it is resolved and it
            // contains the obtained data. In failure it is rejected
            // and it contains the cause of the error.
            // 
            // If the remote node does not exist, the returned Promise
            // will be rejected.
            // 
            // If there are multiple remote nodes, the caller will
            // receive the result returned by one of the remote nodes,
            // but it is not defined exactly which remote node is
            // used.

            var self = this;
            var response_d = $.Deferred();
            try {
                if(!my.defined(args.eval_code)) {
                    throw "eval_code param is mandatory";
                }
                if(!my.defined(args.remote_id)) {
                    throw "remote_id param is mandatory";
                }
                var message = {
                    message_id: my.uuid(), message_type: "select_and_get",
                    from: self.my_remote_id, to: args.remote_id,
                    body: { eval_code: args.eval_code, remote_id: args.remote_id }
                };
                self.pending_request_for[message.message_id] = response_d;
                self.connection_object.send(message);
            }catch(e) {
                response_d.reject(e);
            }
            return response_d.promise();
        },
        selectAndListen: function(args) {
            // @params: args.eval_code (must return a jQuery object),
            //          args.method, args.options = [],
            //          args.callback, args.remote_id
            // 
            // @return: Promise. It will be resolved if the request is
            // accepted by the remote node. The content of the promise
            // is meaningless in this case. In failure, it will be
            // rejected and it contains the cause of the error.
            // 
            // If the remote node does not exist, the resulting
            // Promise will be rejected.
            // 
            // If there are multiple remote nodes, all of them receive
            // the listen request. In this case, the resulting Promise
            // reflects one of the responses from those remote nodes,
            // but there is no guarantee on exactly which response is
            // used to affect the Promise.
            //
            // args.callback is called when the event occurs in the
            // remote node. Arguments for the args.callback is exact
            // copy of the arguments for the remote callback, except
            // that DOM elements are converted to 'Pointer
            // objects'. The structure of a Pointer object is:
            // {"remote_type": "xpath", "remote_id": REMOTE_ID,
            // "remote_xpath": XPATH_STR}. 'this' object for
            // args.callback is the copy of 'this' object for the
            // remote callback. It may be a Pointer object, too.
            
            var self = this;
            var result_d = $.Deferred();
            var message, callback;
            try {
                $.each(["remote_id", "eval_code", "method", "callback"], function(i, mandatory_key) {
                    if(!my.defined(args[mandatory_key])) {
                        throw mandatory_key + " param is mandatory";
                    }
                });
                callback = args.callback;
                if(!my.defined(args.options)) args.options = [];
                message = {
                    message_id: my.uuid(), message_type: "select_and_listen",
                    from: self.my_remote_id, to: args.remote_id,
                    body: {
                        remote_id: args.remote_id, eval_code: args.eval_code, 
                        method: args.method, options: args.options
                    }
                };
                result_d.promise().then(function() {
                    // TODO: about remote signal handler: For now there is
                    // no way to REMOVE signal_callbacks. So, calling
                    // selectAndListen() can cause serious memory leak. We
                    // have to take care of releasing callbacks if we are
                    // serious to do remote callbacks.
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
        
        _onReceive: function(message) {
            // @return: nothing
            var self = this;
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
                from: self.my_remote_id, to: request_message.from,
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

        _createRemoteDOMPointerIfDOM: function(obj) {
            if(my.isHTMLElement(obj)) {
               return {
                   remote_id: this.my_remote_id,
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
                    from: self.my_remote_id, to: request_from,
                    body: {error: error, result: (my.defined(error) ? "NG" : "OK"), in_reply_to: request_id}
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
                        from: self.my_remote_id, to: request_from,
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
