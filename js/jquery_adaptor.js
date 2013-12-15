"use strict";

// jQluster-jQuery adaptor: Convert jQluster modules into jQuery plugin
// requires: jquery, RemoteSelectorFactory

(function(my, $) {
    var factory = null;
    $.jqluster = function(remote_node_id, selector) {
        if(!my.defined(factory)) {
            throw "call $.jqluster.init() first.";
        }
        return factory.forRemoteNode(remote_node_id, selector);
    };
    $.jqluster.init = function(my_node_id, transport_id, options) {
        if(my.defined(factory)) return;
        if(!my.defined(options)) options = {};
        factory = new my.RemoteSelectorFactory($.extend({}, options, {
            node_id: my_node_id, transport_id: transport_id
        }));
    };
    $.jqluster.release = function() {
        if(my.defined(factory)) {
            factory.release();
            factory = null;
        }
    };
})(jQluster, jQuery);


