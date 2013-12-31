"use strict";

/**
 * @file
 * @author Toshio Ito
 */

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var superclass = my.Transport;
    /**
     * @class
     * @alias jQluster.TransportLoopback
     * @extends jQluster.Transport
     *
     * @classdesc jQluster.TransportLoopback is a subclass of {@link
     * jQluster.Transport}. It connects only to itself.
     *
     * @requires jQuery
     * @requires util.js
     * @requires ServerLocal.js
     * @requires ConnectionLocal.js
     * @requires Transport.js
     *
     * The constructor. It takes no argument.
     */
    var myclass = my.TransportLoopback = function() {
        this.loopback_server = new my.ServerLocal();
        superclass.call(this, {
            node_id: "self",
            connection_object: new my.ConnectionLocal(this.loopback_server)
        });
    };
    myclass.prototype = $.extend(
        {}, superclass.prototype,
        /** @lends jQluster.TransportLoopback.prototype */
        {
            /**
             * Same as {@link jQluster.Transport#selectAndGet} except
             * that it operates on the local node no matter what ID is
             * given as `args.node_id`.
             */
            selectAndGet: function(args) {
                if(!args) args = {};
                args.node_id = "self";
                return superclass.prototype.selectAndGet.call(this, args);
            },
            /**
             * Same as {@link jQluster.Transport#selectAndListen}
             * except that it operates on the local node no matter
             * what ID is given as `args.node_id`.
             */
            selectAndListen: function(args) {
                if(!args) args = {};
                args.node_id = "self";
                return superclass.prototype.selectAndListen.call(this, args);
            },
            release: function() {
                superclass.prototype.release.call(this);
                this.loopback_server.release();
                this.loopback_server = null;
            }
        }
    );
})(jQluster, jQuery);

