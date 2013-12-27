"use strict";

/**
 * @file
 * @author Toshio Ito
 */

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var superclass = my.Connection;

    /**
     * @class
     * @alias jQluster.ConnectionWebSocket
     * @extends jQluster.Connection
     * @classdesc jQluster Connection implementation with WebSocket
     * @requires jQuery
     * @requires util.js
     * @requires Connection.js
     *
     * @param websocket_url - WebSocket URL ("ws://...") that it connects to.
     */
    var myclass = my.ConnectionWebSocket = function(websocket_url) {
        superclass.apply(this);
        this.url = websocket_url;
        this.websocket = null;
        this.send_buffer = [];
        this.is_socket_ready = false;
        this._initWebSocket();
    };
    $.each(["log", "error"], function(i, log_func) {
        myclass[log_func] = function(message) {
            console[log_func]("WebSocketConnection: " + message);
        };
    });
    myclass.prototype = $.extend(
        {}, superclass.prototype,
        /** @lends jQluster.ConnectionWebSocket.prototype */
        {
            _initWebSocket: function() {
                var self = this;
                var ws = new WebSocket(self.url);
                self.websocket = ws;
                myclass.log("WebSocket connect to " + self.url);
                ws.onopen = function() {
                    self.is_socket_ready = true;
                    $.each(self.send_buffer, function(i, msg) {
                        self._doSend(msg);
                    });
                    self.send_buffer.length = 0;
                };
                ws.onmessage = function(message) {
                    try {
                        self.triggerReceive(JSON.parse(message.data));
                    }catch(e) {
                        myclass.error("Error while receiving: " + e);
                    }
                }
                ws.onclose = function() {
                    myclass.log("socket closed");
                    self.websocket = null;
                    self.is_socket_ready = false;
                };
                ws.onerror = function(e) {
                    myclass.error("WebSocket error: " + e);
                };
            },
            /** send a message via the WebSocket connection. */
            send: function(message) {
                var self = this;
                if(!my.defined(self.websocket) || !self.is_socket_ready) {
                    self.send_buffer.push(message);
                    return;
                }
                self._doSend(message);
            },
            _doSend: function(message) {
                try {
                    this.websocket.send(my.JSONstringifySafely(message));
                }catch(error) {
                    console.error("Cannot send the following message");
                    console.error(message);
                    throw error;
                }
            },
            release: function() {
                superclass.prototype.release.call(this);
                if(my.defined(this.websocket)) {
                    this.websocket.close();
                }
                this.websocket = null;
                this.is_socket_ready = false;
                this.send_buffer = [];
            }
        }
    );
})(jQluster, jQuery);
