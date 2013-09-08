"use strict";

// jQluster-jQuery adaptor: Convert jQluster modules into jQuery plugin
// requires: jquery, remote_selector_factory

(function(my, $) {
    var factory;
    $.jqluster = function(remote_id, selector) {
        if(!my.defined(factory)) {
            throw "call $.jqluster.init() first.";
        }
        return factory.forRemote(remote_id, selector);
    };
    $.jqluster.init = function(my_remote_id, transport_id, options) {
        if(!my.defined(options)) options = {};
        factory = new my.RemoteSelectorFactory($.extend({}, options, {
            my_remote_id: my_remote_id, transport_id: transport_id
        }));
    };
})(jQluster, jQuery);


