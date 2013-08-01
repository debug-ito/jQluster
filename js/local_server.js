"use strict";

// Local server and connection implementation for testing.
// requires: util.js

if(!jQluster) { var jQluster = {}; }

(function(my, $){
    my.ConnectionLocal = function(server) {
        this.server = server;
        this.receive_callbacks = [];
        this.log = [];
    };
    my.ConnectionLocal.prototype = {
        send: function(message) {
            // @return: nothing
            this.log.push({ direction: "send",  message: my.clone(message)});
            if(message.message_type === "register") {
                this.server.register(this, message.body.remote_id, message.message_id);
            }else {
                this.server.distribute(message);
            }
        },
        
        onReceive: function(callback) {
            // @return: nothing
            this.receive_callbacks.push(callback);
        },

        // below are ConnectionLocal specific functions
        
        getID: function() { return this.remote_id; },

        triggerReceive: function(message) {
            // @return: nothing
            this.log.push({ direction: "receive", message: my.clone(message)});
            $.each(this.receive_callbacks, function(i, callback) {
                callback(message);
            });
        },

        getLog: function() { return this.log; },
        clearLog: function() { this.log = [] }
    };
    
    my.ServerLocal = function() {
        this.connections = {};
        this.register_log = [];
    };
    my.ServerLocal.prototype = {
        register: function(connection, remote_id, register_message_id) {
            // @return: nothing
            if(!this.connections[remote_id]) {
                this.connections[remote_id] = [];
            }
            this.register_log.push(remote_id);
            this.connections[remote_id].push(connection);
            this.distribute({
                message_id: my.uuid(),
                message_type: "register_reply",
                from: null, to: remote_id,
                body: { error: null, in_reply_to: register_message_id }
            });
        },

        distribute: function(message) {
            // @return: nothing
            var conn_list = this.connections[message.to];
            if(!conn_list) return;
            $.each(conn_list, function(i, conn) {
                var dup_message = my.clone(message);
                conn.triggerReceive(dup_message);
            });
        },

        getRegisterLog: function() { return this.register_log; }
    };
})(jQluster, jQuery);
