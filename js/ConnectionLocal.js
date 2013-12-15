"use strict";

// Local connection implementation for testing and loopback transport.
// requires: jquery, util.js, Connection.js

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
        release: function() {
            superclass.prototype.release.call(this);
            this.server = null;
            this.log = [];
        },

        // below are ConnectionLocal specific functions
        getID: function() { return this.remote_id; },
        getLog: function() { return this.log; },
        clearLog: function() { this.log = [] }
    });
})(jQluster, jQuery);
