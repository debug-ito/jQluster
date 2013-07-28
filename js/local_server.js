"use strict";

// Local server implementation for testing.

(function(my, $){
    my.ConnectionLocal = function(remote_id, server) {
        this.remote_id = remote_id;
        this.server = server;
        this.receive_callbacks = [];
    };
    my.ConnectionLocal.prototype = {
        send: function(message) {
            // TODO
        },
        onReceive: function(callback) {
            this.push(receive_callbacks, callback);
        },

        // below are ConnectionLocal specific functions
        getID: function() { return this.remote_id; },
        triggerReceive: function(message) {
            $.each(this.receive_callbacks, function(i, callback) {
                callback(message);
            });
        }
    };
    
    my.ServerLocal = function() {
        this.connections = {};
    };
    my.ServerLocal.prototype = {
        register: function(connection) {
            var remote_id = connection.getID();
            if(!this.connections[remote_id]) {
                this.connections[remote_id] = [];
            }
            this.connections[remote_id].push(connection);
            // TODO: send "register_reply" message. "from" ID is null. How should I create message ID -> my.uuid()
        },
        distribute: function(message) {
            // TODO
        }
    };
})(jQluster, jQuery);
