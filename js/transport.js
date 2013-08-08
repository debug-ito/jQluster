"use strict";

// jQluster Transport object
// requires: jquery, util.js

if(!jQluster) { var jQluster = {}; }


(function(my, $) {
    var myclass;
    myclass = my.Transport = function(args) {
        var self = this;
        // @params: args.remote_id, args.connection_object
        if(!my.defined(args.remote_id)) {
            throw "remote_id param is mandatory";
        }
        if(!my.defined(args.connection_object)) {
            throw "connection_object param is mandatory";
        }
        self.remote_id = args.remote_id;
        self.connection_object = args.connection_object;
        self.pending_request_for = {};
        self.signal_callback_for = {};
        
        self.connection_object.onReceive(function(message) { self._onReceive(message); });
        self.connection_object.send({
            message_id: my.uuid(), message_type: "register",
            from: self.remote_id, to: null,
            body: { remote_id: self.remote_id }
        });
    };
    myclass.prototype = {
        selectAndGet: function(args) {
            // @params: args.eval_code, args.remote_id
            // @return: Deferred that contains the obtained data
            // 
            // If the remote node does not exist, the request is
            // deferred and delivered to the remote node when it
            // appears. If there are multiple remote nodes, the caller
            // will receive the result returned by one of the remote
            // nodes, but it is not defined exactly which remote node
            // is used.

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
                    from: self.remote_id, to: args.remote_id,
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
            // @return: Deferred, whose content is meaningless.
            // 
            // If the remote node does not exist, the 'listen' request
            // is deferred and delivered to the remote node when it
            // appears. If there are multiple remote nodes, all of
            // them receive the listen request.
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
                    from: self.remote_id, to: args.remote_id,
                    body: {
                        remote_id: args.remote_id, eval_code: args.eval_code, 
                        method: args.method, options: args.options
                    }
                };
                self.signal_callback_for[message.message_id] = function(callback_this, callback_args) {
                    callback.apply(callback_this, callback_args);
                };
                self.connection_object.send(message);
                result_d.resolve();
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

        _onReply: function(in_reply_to, message) {
            var self = this;
            var pending_d = self.pending_request_for[in_reply_to];
            if(!my.defined(pending_d)) {
                return;
            }
            delete self.pending_request_for[in_reply_to];
            if(message.message_type === "select_and_get_reply") {
                if(my.defined(message.body.error)) {
                    pending_d.reject("select_and_get error: " + message.body.error);
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
                from: self.remote_id, to: request_message.from,
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
                   remote_id: this.remote_id,
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
                    self.connection_object.send({
                        message_id: my.uuid(), message_type: "signal",
                        from: self.remote_id, to: request_from,
                        body: { error: null, in_reply_to: request_id,
                                callback_this: callback_this, callback_args: callback_args}
                    });
                });
                jq_node[message.body.method].apply(jq_node, args_for_method);
            }catch(e) {
                console.error("_processSelectAndListen error: ");
                console.error(e);
                console.log("TODO: handles and reports selectAndListen error in a better way");
            }
        }
    };
    
})(jQluster, jQuery);
