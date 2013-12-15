"use strict";

// jQluster loopback Transport object
// requires: jquery, util, ServerLocal, ConnectionLocal, Transport

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var superclass = my.Transport;
    var myclass;
    myclass = my.TransportLoopback = function() {
        this.loopback_server = new my.ServerLocal();
        superclass.call(this, {
            my_remote_id: "self",
            connection_object: new my.ConnectionLocal(this.loopback_server)
        });
    };
    myclass.prototype = $.extend({}, superclass.prototype, {
        selectAndGet: function(args) {
            if(!args) args = {};
            args.remote_id = "self";
            return superclass.prototype.selectAndGet.call(this, args);
        },
        selectAndListen: function(args) {
            if(!args) args = {};
            args.remote_id = "self";
            return superclass.prototype.selectAndListen.call(this, args);
        },
        release: function() {
            superclass.prototype.release.call(this);
            this.loopback_server.release();
            this.loopback_server = null;
        }
    });
})(jQluster, jQuery);

