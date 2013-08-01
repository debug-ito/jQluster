"use strict";

// jQluster Transport object
// requires: util.js

if(!jQluster) { var jQluster = {}; }


(function(my, $) {
    my.Transport = function(args) {
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
        
        self.connection_object.onReceive(function(message) { self._onReceive(message); });
        self.connection_object.send({
            message_id: my.uuid(), message_type: "register",
            from: self.remote_id, to: null,
            body: { remote_id: self.remote_id }
        });
    };
    my.Transport.prototype = {
        selectAndGet: function(args) {
            // @params: args.eval_code, args.remote_id
            // @return: Deferred that contains the obtained data
            // 
            // If the remote node does not exist, the request is
            // deferred and delivered to the remote node when it
            // appears. If there are multiple remote nodes, the
            // result is not defined (for now).

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
            // @params: args.eval_code, args.method, args.options = {},
            //          args.callback, args.remote_id
            // @return: Deferred, whose content is meaningless.
            // 
            // If the remote node does not exist, the 'listen' request
            // is deferred and delivered to the remote node when it
            // appears. If there are multiple remote nodes, all of
            // them receive the listen request.
            //
            // A node keeps only one callback for one "listen"
            // request. If a node receives multiple listen requests
            // with the same signature, only the last received one is
            // valid. Callbacks for older requests are discarded.
        },
        
        _onReceive: function(message) {
            // @return: nothing
            var self = this;
            if(my.defined(message.body.in_reply_to)) {
                self._onReply(message.body.in_reply_to, message);
            }else if(message.message_type === "select_and_get") {
                self._processSelectAndGet(message);
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
                pending_d.resolve(message.body.result);
            }else {
                pending_d.reject("unkown message type: " + message.message_type);
            }
        },

        _processSelectAndGet: function(request_message) {
            var self = this;
            var result = null;
            var error = null;
            try {
                result = eval(request_message.body.eval_code);
            }catch(e) {
                error = e;
            }
            var reply = {
                message_id: my.uuid(), message_type: "select_and_get_reply",
                from: self.remote_id, to: request_message.from,
                body: { "error": error,  "result": result, "in_reply_to": request_message.message_id}
            };
            self.connection_object.send(reply);
        }
    };
    
})(jQluster, jQuery);
