"use strict";

// jQluster Transport object
// requires: util.js

if(!jQluster) { var jQluster = {}; }


(function(my, $) {
    my.Transport = function(args) {
        var self = this;
        // @params: args.remote_id (must be truthy), args.connection_object
        if(!args.remote_id) {
            throw "remote_id param is mandatory";
        }
        if(!args.connection_object) {
            throw "connection_object param is mandatory";
        }
        self.remote_id = args.remote_id;
        self.connection_object = args.connection_object;
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
        }
    };
    
})(jQluster, jQuery);
