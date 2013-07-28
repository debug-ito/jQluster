"use strict";

// jQluster Transport object
// requires: util.js

jQluster ||= {};

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
        self.remote_id = remote_id;
        self.connection_object = connection_object;
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
        },
        selectAndListen: function(args) {
            // @params: args.eval_code, args.method, args.options = {},
            //          args.callback, args.remote_id
            // @return: nothing (for now)
        },
        
        _onReceive: function(message) {
        }
    };
    
})(jQluster, jQuery);
