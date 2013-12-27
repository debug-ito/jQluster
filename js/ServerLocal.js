"use strict";

/**
 * @file
 * @author Toshio Ito
 */

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var REPLY_MESSAGE_TYPE_FOR = {
        select_and_get: "select_and_get_reply",
        select_and_listen: "select_and_listen_reply"
    };
    /**
     * @class
     * @alias jQluster.ServerLocal
     * @classdesc Local server implementation for testing and loopback transport.
     * @requires jQuery
     * @requires util.js
     * @requires Connection.js
     * @param {boolean} [args.debug=false] - if true, the server will emit debug messages.
     */
    my.ServerLocal = function(args) {
        if(!args) args = {};
        
        // Cyclic reference between the server and connections, but
        // it's (probably) ok.  JavaScript garbage collectors can
        // release cyclic objects UNLESS THE CYCLE DOES NOT INVOLVE
        // DOM NODES.
        this.connections = {};
        this.register_log = [];
        this.debug = !!args.debug;
    };
    /**
     * @alias jQluster.ServerLocal.prototype
     */
    my.ServerLocal.prototype = {
        _dlog: function(message, obj) {
            console.debug("ServerLocal: " + message);
            console.debug(obj);
        },
        /**
         * Register a Connection with the server.
         * @returns nothing
         * @param {jQluster.ConnectionLocal} connection - the connection.
         * @param node_id - Node ID of the connection.
         * @param {jQluster.Connection~Message} register_message_id -
         * the message of the type "register".
         */
        register: function(connection, node_id, register_message_id) {
            var self = this;
            if(self.debug) {
                self._dlog("Got register from " + node_id);
            }
            if(!self.connections[node_id]) {
                self.connections[node_id] = [];
            }
            self.register_log.push(node_id);
            self.connections[node_id].push(connection);
            self.distribute({
                message_id: my.uuid(),
                message_type: "register_reply",
                from: null, to: node_id,
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

        /**
         * Distribute the given message to all destination connections.
         * @returns nothing.
         * @param {jQluster.Connection~Message} message - message to distribute.
         */
        distribute: function(message) {
            var self = this;
            if(self.debug) {
                self._dlog("Send message: " + message.message_type, message);
            }
            var conn_list = self.connections[message.to];
            if(!conn_list) {
                self._tryReplyTo(message, "target node does not exist.");
                return;
            }
            $.each(conn_list, function(i, conn) {
                var dup_message = my.cloneViaJSON(message);
                conn.triggerReceive(dup_message);
            });
        },

        /**
         * @returns {Array} the registration log.
         */
        getRegisterLog: function() { return this.register_log; },

        /**
         * Safely release the server's resource.
         * @returns nothing
         */
        release: function() {
            var self = this;
            $.each(self.connections, function(node_id, connection_list) {
                $.each(connection_list, function(i, connection) {
                    connection.release();
                });
            });
            self.connections = {};
            self.register_log = [];
        },
    };
})(jQluster, jQuery);

