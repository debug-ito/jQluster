"use strict";

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
     * @author Toshio Ito
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
         * @abstract
         */
        send: function() { throw "send() must be implemented"; },
        
        /** 
         * A callback that is called when some data is received via this Connection.
         * @callback jQluster.Connection~receiveCallback
         * @param message
         */
        
        /**
         * Register receiveCallback
         * @param {jQluster.Connection~receiveCallback} callback
         * @returns nothing
         */
        onReceive: function(callback) {
            this.receive_callbacks.push(callback);
        },

        /**
         * Tell the Connection some data is arrived.
         * @protected
         * @returns nothing
         */
        triggerReceive: function(message) {
            $.each(this.receive_callbacks, function(i, callback) {
                callback(message);
            });
        },
    };
})(jQluster, jQuery);


