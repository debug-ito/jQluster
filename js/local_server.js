"use strict";

// Local server and connection implementation for testing.
// requires: jquery, util.js

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
            // console.log("send: type: " + message.message_type + ", from: " + message.from);
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
            // console.log("receive: type: " + message.message_type + ", to: " + message.to);
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
        this.pending_messages_to = {};
    };
    my.ServerLocal.prototype = {
        register: function(connection, remote_id, register_message_id) {
            // @return: nothing
            var self = this;
            if(!self.connections[remote_id]) {
                self.connections[remote_id] = [];
            }
            self.register_log.push(remote_id);
            self.connections[remote_id].push(connection);
            self.distribute({
                message_id: my.uuid(),
                message_type: "register_reply",
                from: null, to: remote_id,
                body: { error: null, in_reply_to: register_message_id }
            });
            if(self.pending_messages_to[remote_id] && self.pending_messages_to[remote_id].length > 0) {
                $.each(self.pending_messages_to[remote_id], function(i, message) {
                    self.distribute(message);
                });
                self.pending_messages_to.length = 0;
            }
        },


        distribute: function(message) {
            // @return: nothing
            var self = this;
            var conn_list = self.connections[message.to];
            if(!conn_list) {
                if(!self.pending_messages_to[message.to]) {
                    self.pending_messages_to[message.to] = [];
                }
                self.pending_messages_to[message.to].push(my.clone(message));
                return;
            }
            $.each(conn_list, function(i, conn) {
                var dup_message = my.cloneViaJSON(message);
                conn.triggerReceive(dup_message);
            });
        },

        getRegisterLog: function() { return this.register_log; }
    };
})(jQluster, jQuery);
