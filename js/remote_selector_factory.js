"use strict";

// jQluster factory object for generating RemoteSelector objects
// requires: jquery, util, remote_selector, transport, local_server

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var local_server;
    var myclass = my.RemoteSelectorFactory = function(args) {
        // @params: args.my_remote_id, args.transport_id
        if(!my.defined(args.my_remote_id)) {
            throw "my_remote_id parameter is mandatory";
        }
        if(!my.defined(args.transport_id)) {
            throw "transport_id parameter is mandatory";
        }
        this.transport = myclass._createTransport(args.my_remote_id, args.transport_id);
    };
    myclass._createTransport = function(my_remote_id, transport_id) {
        return new my.Transport({
            remote_id: my_remote_id,
            connection_object: myclass._createConnection(transport_id)
        });
    };
    myclass._createConnection = function(transport_id) {
        if(transport_id === "local") {
            if(!local_server) {
                local_server = new my.ServerLocal();
            }
            return new my.ConnectionLocal(local_server);
        }
        throw "Unknown transport_id: " + transport_id;
    };
    myclass.prototype = {
        forRemote: function(remote_id, selector) {
            var self = this;
            var factory = function(target) {
                return new my.RemoteSelector({
                    transport: self.transport,
                    remote_id: remote_id,
                    selector: target
                });
            };
            if(my.defined(selector)) {
                return factory(selector);
            }else {
                return factory;
            }
        }
    };
})(jQluster, jQuery);

