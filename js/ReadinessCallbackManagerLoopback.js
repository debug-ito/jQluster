"use strict";

// jQluster readiness callback manager for loopback transport
// requires: jquery, util

if(!jQluster) { jQluster = {}; }

(function(my, $) {
    var superclass = my.ReadinessCallbackManager;
    var myclass = my.ReadinessCallbackManagerLoopback = function(args) {
        // @params: args.transport
        if(!args) args = {};
        if(!my.defined(args.transport)) {
            throw "transport parameter is mandatory";
        }
        args.notify = [args.transport.getMyRemoteID()];
        superclass.call(this, args);
    };
    myclass.prototype = $.extend({}, superclass.prototype, {
        listenToRemoteReadiness: function(remote_id, callback) {
            return superclass.prototype.listenToRemoteReadiness.call(this, this.transport.getMyRemoteID(), callback);
        },
    });
})(jQluster, jQuery);
