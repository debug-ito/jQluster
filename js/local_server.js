"use strict";

// Local server and connection implementation for testing.
// requires: jquery, util.js, connection.js

if(!jQluster) { var jQluster = {}; }

(function(my, $){
    var superclass = my.Connection;

    // jQluster Connection implementation specifically to the ServerLocal object.
    my.ConnectionLocal = function(server) {
        superclass.apply(this);
        this.server = server;
        this.log = [];
    };
    my.ConnectionLocal.prototype = $.extend({}, superclass.prototype, {
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
        triggerReceive: function(message) {
            this.log.push({ direction: "receive", message: my.clone(message)});
            return superclass.prototype.triggerReceive.call(this, message);
        },

        // below are ConnectionLocal specific functions
        getID: function() { return this.remote_id; },
        getLog: function() { return this.log; },
        clearLog: function() { this.log = [] }
    });
})(jQluster, jQuery);

(function(my, $) {
    var REPLY_MESSAGE_TYPE_FOR = {
        select_and_get: "select_and_get_reply",
        select_and_listen: "select_and_listen_reply"
    };
    my.ServerLocal = function(args) {
        // @params: args.debug = false
        if(!args) args = {};
        
        // ** Cyclic reference between the server and connections, but
        // ** it's (probably) ok.  JavaScript garbage collectors can
        // ** release cyclic objects UNLESS THE CYCLE DOES NOT INVOLVE
        // ** DOM NODES.
        this.connections = {};
        this.register_log = [];
        this.debug = !!args.debug;
    };
    my.ServerLocal.prototype = {
        _dlog: function(message, obj) {
            console.debug("ServerLocal: " + message);
            console.debug(obj);
        },
        register: function(connection, remote_id, register_message_id) {
            // @return: nothing
            var self = this;
            if(self.debug) {
                self._dlog("Got register from " + remote_id);
            }
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
        },
        _tryReplyTo: function(original_message, error) {
            var reply_message_type = REPLY_MESSAGE_TYPE_FOR[original_message.message_type];
            if(!my.defined(error)) {
                error = null;
            }
            if(!my.defined(reply_message_type)) return;
            this.distribute({
                message_id: my.uuid(),
                message_type: reply_message_type,
                from: null, to: original_message.from,
                body: { error: error, in_reply_to: original_message.message_id }
            });
        },

        distribute: function(message) {
            // @return: nothing
            var self = this;
            if(self.debug) {
                self._dlog("Send message: " + message.message_type, message);
            }
            var conn_list = self.connections[message.to];
            if(!conn_list) {
                self._tryReplyTo(message, "target remote node does not exist.");
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
