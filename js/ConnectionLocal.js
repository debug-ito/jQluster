"use strict";

/**
 * @file
 * @author Toshio Ito
 */

if(!jQluster) { var jQluster = {}; }

(function(my, $){
    var superclass = my.Connection;

    /**
     * @class
     * @alias jQluster.ConnectionLocal
     * @extends jQluster.Connection
     *
     * @classdesc Local connection implementation for testing and loopback transport.
     * @requires jQuery
     * @requires util.js
     * @requires Connection.js
     *
     * @example
     * var server = new jQluster.ServerLocal();
     * var conn = new jQluster.ConnectionLocal(server);
     *
     * @param {jQluster.ServerLocal} server - local server object.
     */
    my.ConnectionLocal = function(server) {
        superclass.apply(this);
        this.server = server;
        this.log = [];
    };
    my.ConnectionLocal.prototype = $.extend(
        {}, superclass.prototype,
        /** @lends jQluster.ConnectionLocal.prototype */
        {
            /** send a message to the local server. */
            send: function(message) {
                this.log.push({ direction: "send",  message: my.clone(message)});
                // console.log("send: type: " + message.message_type + ", from: " + message.from);
                if(message.message_type === "register") {
                    this.server.register(this, message.body.node_id, message.message_id);
                }else {
                    this.server.distribute(message);
                }
            },
            triggerReceive: function(message) {
                this.log.push({ direction: "receive", message: my.clone(message)});
                return superclass.prototype.triggerReceive.call(this, message);
            },
            release: function() {
                superclass.prototype.release.call(this);
                this.server = null;
                this.log = [];
            },

            // below are ConnectionLocal specific functions
            getLog: function() { return this.log; },
            clearLog: function() { this.log = [] }
        }
    );
})(jQluster, jQuery);
