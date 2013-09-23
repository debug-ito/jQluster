"use strict";

// jQluster loopback Transport object
// requires: jquery, util, local_server, transport

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var superclass = my.Transport;
    var myclass;
    myclass = my.TransportLoopback = function() {
        this.loopback_server = new my.ServerLocal();
        superclass.call(this, {
            remote_id: "self",
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
        }
    });
})(jQluster, jQuery);

