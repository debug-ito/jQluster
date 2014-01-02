"use strict";

/**
 * @file
 * @author Toshio Ito
 */

if(!jQluster) { jQluster = {}; }

(function(my, $) {
    var superclass = my.ReadinessCallbackManager;
    /**
     * @class
     * @alias jQluster.ReadinessCallbackManagerLoopback
     * @extends jQluster.ReadinessCallbackManager
     *
     * @classdesc This class is an extension of {@link
     * jQluster.ReadinessCallbackManager}, that redirects all "listen"
     * requiests to itself.
     *
     * @requires jQuery
     * @requires util.js
     * @requires Transport.js
     *
     * @param {jQluster.Transport} args.transport
     */
    var myclass = my.ReadinessCallbackManagerLoopback = function(args) {
        if(!args) args = {};
        if(!my.defined(args.transport)) {
            throw "transport parameter is mandatory";
        }
        args.notify = [args.transport.getNodeID()];
        superclass.call(this, args);
    };
    myclass.prototype = $.extend(
        {}, superclass.prototype,
        /** @lends jQluster.ReadinessCallbackManagerLoopback.prototype */
        {
            /**
             * Overridden to be loopback. No matter what ID is given
             * as `node_id` argument, it listens to itself for
             * readiness.
             * @see {@link jQluster.ReadinessCallbackManager#listenToRemoteReadiness}
             */
            listenToRemoteReadiness: function(node_id, callback) {
                return superclass.prototype.listenToRemoteReadiness.call(this, this.transport.getNodeID(), callback);
            },
        }
    );
})(jQluster, jQuery);
