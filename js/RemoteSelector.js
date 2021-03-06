"use strict";

/**
 * @file
 * @author Toshio Ito
 */

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    /**
     * @class
     * @alias jQluster.RemoteSelector
     *
     * @classdesc jQluster.RemoteSelector is an object that is similar
     * to jQuery object (the one you get by `$(SOME_SELECTOR)`), but
     * it is a selector of DOM objects in a remote node.
     *
     * It wraps a {@link jQluster.Transport} object and provides a lot
     * of useful methods similar to jQuery's methods.
     *
     * @requires jQuery
     * @requires util.js
     * @requires Transport.js
     *
     * @see {@link http://api.jquery.com} for explanation of methods.
     *
     * @example
     * var alice = new jQluster.Transport({
     *     node_id: "Alice",
     *     connection_object: new jQluster.ConnectionWebSocket({
     *         websocket_url: "ws://example.com/jqluster"
     *     }),
     * });
     * var selector_alice_to_bob = new jQluster.RemoteSelector({
     *     transport: alice,
     *     node_id: "Bob",
     *     selector: "#some-button"
     * });
     * 
     * selector_alice_to_bob.val().then(function(value) {
     *     console.log("button value: " + value);
     * });
     * 
     * selector_alice_to_bob.on("click", function() {
     *     console.log("Button clicked");
     *     selector_alice_to_bob.val("Button clicked");
     * });
     * @param {jQluster.Transport} args.transport - the transport
     * object representing the local node.

     * @param {string} args.node_id - the Node ID of the target remote
     * node.
     *
     * @param {string} args.eval_code - JavaScript code that is
     * evaluated to get a jQuery object on the remote node. You must
     * specify `args.eval_code`, `args.selector` or `args.xpath`.
     *
     * @param {string} args.selector - a jQuery selector string that
     * is used to get a jQuery object on the remote node.
     *
     * @param {string} args.xpath - a XPath string that is used to get
     * a jQuery object on the remote node.
     *
     */
    var myclass = my.RemoteSelector = function(args) {
        if(!my.defined(args.transport)) {
            throw "transport parameter is mandatory";
        }
        if(!my.defined(args.node_id)) {
            throw "node_id parameter is mandatory";
        }
        this.transport = args.transport;
        this.node_id = args.node_id;
        if(my.defined(args.xpath)) {
            this.eval_code = myclass._getEvalCodeFromXPath(args.xpath);
        }else if(my.defined(args.selector)) {
            this.eval_code = myclass._getEvalCodeFromSelector(args.selector);
        }else if(my.defined(args.eval_code)) {
            this.eval_code = args.eval_code;
        }else {
            throw "Either eval_code, selector or xpath parameter is mandatory";
        }
    };
    myclass._getEvalCodeFromXPath = function(xpath) {
        return "$(document).xpath("+ my.quoteString(xpath) +")";
    };
    myclass._getEvalCodeFromSelector = function(selector) {
        return "$("+ my.quoteString(selector) +")";
    };
    myclass._logPromiseError = function(promise) {
        promise.then(null, function(error) {
            console.error(error);
        });
        return promise;
    };
    /**
     * @namespace
     */
    myclass.prototype = {
        _getEvalCode: function() { return this.eval_code; },

        /**
         * @todo on() method: For now, the return value from
         * user-given handler function is ignored. This means we
         * cannot control whether the specified event should propagate
         * to the upper elements or not. It is possible in theory to
         * send the user-generated return value back to the remote
         * node, but in this case the process of the remote node must
         * be blocked waiting for the return value to come. If we
         * could use a co-routine mechanism like task.js, waiting for
         * the return value from the network would not block the
         * entire process, but that's not a feature every browser
         * supports now.
        */
        on: function() {
            var self = this;
            var args = my.argsToArray(arguments);
            var events = args.shift();
            if(!my.defined(events)) {
                throw "events parameter is mandatory";
            }
            if($.isPlainObject(events)) {
                $.each(events, function(event_name, handler) {
                    var args_for_next = [event_name].concat(args);
                    args_for_next.push(handler);
                    self.on.apply(self, args_for_next);
                });
                return self;
            }
            var handler = args.pop();
            if(!my.defined(handler)) {
                throw "handler parameter is mandatory";
            }
            var options = [events].concat(args);
            var transport_args = {
                eval_code: self._getEvalCode(),
                method: "on", options: options,
                node_id: self.node_id, callback: handler
            };
            myclass._logPromiseError(self.transport.selectAndListen(transport_args));
            return self;
        },

        /**
         * 
         * @todo each() method: For now, there is no way to detect the
         * end of the "each" loop. The end of the loop should be
         * reported to the caller in some form of Promise. In
         * addition, the remote signal handler should be removed from
         * the Transport object at the end of the loop. This problem
         * is more serious when we implement ".map()" method, because
         * it would make no sense if it could not return any value at
         * the end of the loop.
         */
        each: function(handler) {
            var self = this;
            if(!my.defined(handler)) {
                throw "handler parameter is mandatory";
            }
            var loop_enabled = true;
            var result = self.transport.selectAndListen({
                eval_code: self._getEvalCode(),
                method: "each", node_id: self.node_id,
                callback: function(index, remote_elem) {
                    var callback_result;
                    if(loop_enabled) {
                        callback_result = handler.call(this, index, remote_elem);
                        if(callback_result === false) {
                            loop_enabled = false;
                        }
                    }
                }
            });
            myclass._logPromiseError(result);
            return self;
        },

        off: function(events, selector) {
            var args_str = my.defined(selector) ? my.argumentsStringFor([events, selector])
                                                : my.argumentsStringFor([events]);
            var result = this.transport.selectAndGet({
                eval_code: this._getEvalCode() + ".off("+ args_str +")",
                node_id: this.node_id
            });
            myclass._logPromiseError(result);
            return this;
        },

        promise: function(type, target) {
            var self = this;
            if (typeof type !== "string") {
		target = type;
		type = undefined;
	    }
            var args_str = (type === undefined) ? "" : my.argumentsStringFor([type]);
            var result_deferred = $.Deferred();
            self.transport.selectAndGet({
                eval_code: self._getEvalCode() + ".promise("+ args_str +")",
                node_id: self.node_id
            }).then(function() {
                result_deferred.resolveWith(self, [self]);
            }, function() {
                result_deferred.rejectWith(self, [self]);
            });
            return result_deferred.promise(target);
        }
    };

    var selectionMethod = function(method_name) {
        myclass.prototype[method_name] = function() {
            return new myclass({
                transport: this.transport, node_id: this.node_id,
                eval_code: this.eval_code + "." + method_name + "("+ my.argumentsStringFor(arguments) +")"
            });
        };
    };
    $.each([
        "children", "closest", "contents", "eq",
        "end", "filter", "find", "first", "has", "is", "last",
        "next", "nextAll", "nextUntil", "not", "offsetParent",
        "parent", "parents", "parentsUntil",
        "prev", "prevAll", "prevUntil", "siblings", "slice",
    ], function(i, method_name) {
        selectionMethod(method_name);
    });

    var accessorMethod = function(method_name, min_arg, max_arg_get) {
        myclass.prototype[method_name] = function() {
            if(arguments.length < min_arg) {
                throw method_name + " needs at least" + min_arg + " arguments";
            }
            var eval_code = this.eval_code + "."+ method_name +"("+ my.argumentsStringFor(arguments) +")";
            var select_result = this.transport.selectAndGet({
                node_id: this.node_id, eval_code: eval_code
            });
            if(max_arg_get === null || arguments.length <= max_arg_get) {
                return select_result;
            }else {
                myclass._logPromiseError(select_result);
                return this;
            }
        };
    };
    $.each([
        ["attr", 1, 1], ["hasClass", 1, 1], ["val", 0, 0], ["css", 1, 1],
        ["height", 0, 0], ["innerHeight", 0, null], ["innerWidth", 0, null], ["outerHeight", 0, null],
        ["outerWidth", 0, null], ["width", 0, 0], ["data", 1, 1], ["text", 0, 0],
        ["index", 0, null], ["size", 0, null], ["html", 0, 0],
        ["position", 0, null], ["prop", 1, 1], ["scrollLeft", 0, 0], ["scrollTop", 0, 0],
        ["offset", 0, 0],
        ["addClass", 1, 0], ["after", 1, 0], ["append", 1, 0], ["appendTo", 1, 0],
        ["before", 1, 0], ["detach", 0, -1], ["empty", 0, -1], ["insertAfter", 1, 0], ["insertBefore", 1, 0],
        ["prepend", 1, 0], ["prependTo", 1, 0], ["remove", 0, -1], ["removeAttr", 1, 0], ["removeClass", 0, -1],
        ["removeProp", 1, 0], ["replaceAll", 1, 0], ["replaceWith", 1, 0], ["toggleClass", 1, 0],
        ["unwrap", 0, -1], ["wrap", 1, 0], ["wrapAll", 1, 0], ["wrapInner", 1, 0],
        ["trigger", 1, 0], 
    ], function(i, method_spec) {
        accessorMethod.apply(null, method_spec);
    });

    var effectsMethod = function(method_name) {
        myclass.prototype[method_name] = function() {
            var self = this;
            var args = my.argsToArray(arguments);
            var callback = null;
            var eval_code = self._getEvalCode();
            var select_result;
            if(args.length > 0 && $.isFunction(args[args.length-1])) {
                callback = args.pop();
            }
            if(my.defined(callback)) {
                select_result = self.transport.selectAndListen({
                    eval_code: eval_code,
                    node_id: self.node_id,
                    method: method_name,
                    options: args,
                    callback: callback
                });
            }else {
                eval_code += "."+ method_name +"("+ my.argumentsStringFor(args) +")";
                select_result = self.transport.selectAndGet({
                    eval_code: eval_code,
                    node_id: self.node_id
                });
            }
            myclass._logPromiseError(select_result);
            return self;
        };
    };
    $.each(["animate", "fadeIn", "fadeTo", "fadeOut", "fadeToggle",
            "slideDown", "slideUp", "slideToggle",
            "hide", "show", "toggle"], function(i, method_name) {
        effectsMethod(method_name);
    });

})(jQluster, jQuery);

/**
 * @name jQluster.RemoteSelector#Selection Methods
 * @method
 *
 * @desc This class has the following jQuery methods for DOM selection
 * on the remote node.
 *
 * - `children`
 * - `closest`
 * - `contents`
 * - `end`
 * - `eq`
 * - `filter`
 * - `find`
 * - `first`
 * - `has`
 * - `is`
 * - `last`
 * - `nextAll`
 * - `nextUntil`
 * - `next`
 * - `not`
 * - `offsetParent`
 * - `parent`
 * - `parentsUntil`
 * - `parents`
 * - `prevAll`
 * - `prevUntil`
 * - `prev`
 * - `siblings`
 * - `slice`
 *
 * @todo Only string arguments (such as ".some-class") are currently
 * supported. HTML elements or jQuery objects are not supported as
 * arguments.
 *
 */

/**
 * @name jQluster.RemoteSelector#Accessor Methods
 * @method
 *
 * @desc This class has the following jQuery methods for
 * getting/setting various data on the remote node.
 *
 * Note that getter methods return their results as a jQuery.Promise,
 * which is not the same way as the original jQuery. This is
 * inevitable because getting values from remote nodes involves
 * communication over the network, with potential delay and
 * communication error.
 *
 * - `addClass`
 * - `after`
 * - `appendTo`
 * - `append`
 * - `attr`
 * - `before`
 * - `css`
 * - `data`
 * - `detach`
 * - `empty`
 * - `hasClass`
 * - `height`
 * - `html`
 * - `index`
 * - `innerHeight`
 * - `innerWidth`
 * - `insertAfter`
 * - `insertBefore`
 * - `off`
 * - `offset`
 * - `outerHeight`
 * - `outerWidth`
 * - `position`
 * - `prependTo`
 * - `prepend`
 * - `promise`
 * - `prop`
 * - `removeAttr`
 * - `removeClass`
 * - `removeProp`
 * - `remove`
 * - `replaceAll`
 * - `replaceWith`
 * - `scrollLeft`
 * - `scrollTop`
 * - `size`
 * - `text`
 * - `toggleClass`
 * - `trigger`
 * - `unwrap`
 * - `val`
 * - `width`
 * - `wrapAll`
 * - `wrapInner`
 * - `wrap`
 *
 * @todo Only string arguments (such as ".some-class") are currently
 * supported. HTML elements or jQuery objects are not supported as
 * arguments.
 *
 * @todo **off() method**: this method removes the event handler attached
 * to the DOM objects in the remote node, but NOT the remote signal
 * handler attached to the local {@link jQluster.Transport} object. We
 * must figure out how to release the remote signal handler.
 *
 * @todo **setter methods**: they return the context object ('this'
 * remote selector), but this behavior is not completely the same as
 * the original jQuery. If further methods are chained from a setter
 * method, e.g. `$_(".foobar").height(100).find(".hoge").width(50)`,
 * it will be translated as two sentences on the remote node;
 * `$(".foobar").height(100)` and
 * `$(".foobar").find(".hoge").width(50);` The two sentences may do
 * what you mean, but may not sometimes especially if the intermediate
 * setter method manipulates DOM structure (because `$(".foobar")` is
 * evaluated again in the second sentence). If we were able to detect
 * method chaining and its termination, we could send a single
 * sentence in the above mentioned scenario, but it's not possible,
 * right? Or it would help to have actual jQuery objects on the remote
 * node that correspond to all RemoteSelector objects on the local
 * node. However, how can we release the jQuery objects on the remote
 * node that are no longer used? Perhaps we should just make setter
 * methods return nothing to prevent confusion.
 */

/**
 * @name jQluster.RemoteSelector#Effect Methods
 * @method
 *
 * @desc This class has the following methods for visual effects.
 *
 * - `animate`
 * - `fadeIn`
 * - `fadeOut`
 * - `fadeTo`
 * - `fadeToggle`
 * - `hide`
 * - `show`
 * - `slideDown`
 * - `slideToggle`
 * - `slideUp`
 * - `toggle`
 *
 */
