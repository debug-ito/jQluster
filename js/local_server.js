"use strict";

// Local server and connection implementation for testing.
// requires: util.js

jQluster ||= {};

(function(my, $){
    my.ConnectionLocal = function(server) {
        this.server = server;
        this.receive_callbacks = [];
    };
    my.ConnectionLocal.prototype = {
        send: function(message) {
            // @return: nothing
            if(message.message_type === "register") {
                this.server.register(this, message.body.remote_id);
            }else {
                this.server.distribute(message);
            }
        },
        
        onReceive: function(callback) {
            // @return: nothing
            this.push(receive_callbacks, callback);
        },

        // below are ConnectionLocal specific functions
        
        getID: function() { return this.remote_id; },

        triggerReceive: function(message) {
            // @return: nothing
            $.each(this.receive_callbacks, function(i, callback) {
                callback(message);
            });
        }
    };
    
    my.ServerLocal = function() {
        this.connections = {};
    };
    my.ServerLocal.prototype = {
        register: function(connection, remote_id) {
            // @return: nothing
            if(!this.connections[remote_id]) {
                this.connections[remote_id] = [];
            }
            this.connections[remote_id].push(connection);
            this.distribute({
                message_id: my.uuid(),
                message_type: "register_reply",
                from: null, to: remote_id,
                body: { status: "OK" }
            });
        },

        distribute: function(message) {
            // @return: nothing
            var conn_list = this.connections[message.to];
            if(!conn_list) return;
            $.each(conn_list, function(i, conn) {
                var dup_message = $.extend(true, {}, message);
                conn.triggerReceive(dup_message);
            });
        }
    };
})(jQluster, jQuery);
