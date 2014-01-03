"use strict";

/**
 * @file jquery_adaptor.js is a thin wrapper for {@link
 * jQluster.RemoteSelectorFactory}. It maintains a singleton of
 * RemoteSelectorFactory, and creates interface to it in jQuery
 * namespace.
 *
 * @author Toshio Ito
 * @requires jQuery
 * @requires RemoteSelectorFactory.js
 */

/**
 * @external jQuery
 * @see {@link http://jquery.com}
 */

(function(my, $) {
    var factory = null;
    /**
     * @namespace {function} external:jQuery.jqluster
     *
     * @desc jQuery.jqluster is a function as well as a namespace. As
     * a function, it's equivalent to {@link
     * jQluster.RemoteSelectorFactory#forRemoteNode} method on the
     * singleton RemoteSelectorFactory.
     *
     * @example
     * // Initialize the local node as "Alice".
     * $.jqluster.init("Alice", "ws://example.com/jqluster");
     * 
     * // Get the remote jQuery on the node Bob.
     * var $bob = $.jqluster("Bob");
     * 
     * $bob(function() {
     *     console.log("Bob is ready");
     *     $bob("#some-box").text("Detected Bob is ready");
     * });
     */
    $.jqluster = function(remote_node_id, selector) {
        if(!my.defined(factory)) {
            throw "call $.jqluster.init() first.";
        }
        return factory.forRemoteNode(remote_node_id, selector);
    };
    /**
     * @function external:jQuery.jqluster.init
     *
     * @desc Initialize the singleton RemoteSelectorFactory
     * object.
     *
     * @param {string} my_node_id - The Node ID of the local node.
     *
     * @param {string} transport_id - The transport ID for creating
     * RemoteSelectors.
     *
     * @param {Object} [options={}] - Other options that are passed to
     * the constructor of {@link jQluster.RemoteSelectorFactory}.
     *
     * @see {@link jQluster.RemoteSelectorFactory}
     */
    $.jqluster.init = function(my_node_id, transport_id, options) {
        if(my.defined(factory)) return;
        if(!my.defined(options)) options = {};
        factory = new my.RemoteSelectorFactory($.extend({}, options, {
            node_id: my_node_id, transport_id: transport_id
        }));
    };
    /**
     * @function external:jQuery.jqluster.release
     *
     * @desc Equvalent to {@link jQluster.RemoteSelectorFactory#release}
     * method on the singleton RemoteSelectorFactory.
     */
    $.jqluster.release = function() {
        if(my.defined(factory)) {
            factory.release();
            factory = null;
        }
    };
})(jQluster, jQuery);


