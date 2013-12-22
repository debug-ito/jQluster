"use strict";

/**
 * @file
 * @author Toshio Ito
 */

/** @namespace jQluster */
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
         * @abstract
         */
        send: function() { throw "send() must be implemented"; },

        /**
         * A message object that is exchanged via Connection.
         * @typedef {Object} jQluster.Connection~Message
         * @see doc/protocol.md in jQluster package.
         */
        
        /** 
         * A callback that is called when some data is received via this Connection.
         * @callback jQluster.Connection~ReceiveCallback
         * @param {jQluster.Connection~Message} message
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
