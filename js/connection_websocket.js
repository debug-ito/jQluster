"use strict";

// jQluster Connection implementation with WebSocket
// requires: jquery, util, connection

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var superclass = my.Connection;
    
    var myclass = my.ConnectionWebSocket = function(websocket_url) {
        superclass.apply(this);
        this.url = websocket_url;
        this.websocket = null;
        this._initWebSocket();
        this.send_buffer = [];
        this.is_socket_ready = false;
    };
    $.each(["log", "error"], function(i, log_func) {
        myclass[log_func] = console[log_func]("WebSocketConnection: " + message);
    });
    myclass.prototype = $.extend(new superclass(), {
        _initWebSocket: function() {
            var self = this;
            var ws = self.websocket = new WebSocket(self.url);
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
        send: function(message) {
            if(!my.defined(self.websocket) || !self.is_socket_ready) {
                self.send_buffer.push(message);
                return;
            }
            self._doSend(message);
        },
        _doSend: function(message) {
            self.websocket.send(JSON.stringify(message));
        }
    });
})(jQluster, jQuery);
