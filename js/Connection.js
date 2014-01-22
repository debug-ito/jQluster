"use strict";

/**
 * @file
 * @author Toshio Ito
 */

if(!jQluster) { var jQluster = {}; }


(function(my, $) {
    /**
     * @class 
     * @alias jQluster.Connection
     * @classdesc jQluster abstract "Connection" class. A Connection
     * object is supposed to be contained by Transport object.
     *
     * @requires jQuery
     */
    var myclass = my.Connection = function() {
        this.receive_callbacks = [];
    };
    myclass.prototype = {
        /** Safely release the Connection's resource. */
        release: function() {
            this.receive_callbacks = [];
        },
        /**
         * Send data via this Connection.
         * @param {jQluster.Connection~Message} message
         * @returns nothing
         * @abstract
         *
         * @todo send() may fail, for example when the connection is
         * lost. What should we do in this case? Maybe it should
         * return a promise indicating whether it succeeds or not.
         */
        send: function() { throw "send() must be implemented"; },

        /**
         * @typedef {Object} jQluster.Connection~Message
         * @desc A message object that is exchanged via Connection.
         * @see doc/protocol.md in jQluster package.
         */
        
        /** 
         * @callback jQluster.Connection~ReceiveCallback
         * @param {jQluster.Connection~Message} message
         * @desc A callback that is called when some data is received via this Connection.
         */
        
        /**
         * Register receiveCallback
         * @param {jQluster.Connection~ReceiveCallback} callback
         * @returns nothing
         */
        onReceive: function(callback) {
            this.receive_callbacks.push(callback);
        },

        /**
         * Tell the Connection some data is arrived.
         * @returns nothing
         */
        triggerReceive: function(message) {
            $.each(this.receive_callbacks, function(i, callback) {
                callback(message);
            });
        },
    };
})(jQluster, jQuery);
