"use strict";

// jQluster abstract "Connection" class. A Connection object is
// supposed to be contained by Transport object.

// requires: jquery

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var myclass = my.Connection = function() {
        this.receive_callbacks = [];
    };
    myclass.prototype = {
        release: function() {
            this.receive_callbacks = [];
        },
        send: function() { throw "send() must be implemented"; },
        onReceive: function(callback) {
            // @return: nothing
            this.receive_callbacks.push(callback);
        },
        triggerReceive: function(message) {
            // @return: nothing
            $.each(this.receive_callbacks, function(i, callback) {
                callback(message);
            });
        },
    };
})(jQluster, jQuery);


