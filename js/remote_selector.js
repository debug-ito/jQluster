"use strict";

// jQluster remote selector representation
// requires: jquery, util.js, (transport.js)

if(!jQluster) { var jQluster = {}; }

(function(my, $) {
    var myclass;
    myclass = my.RemoteSelector = function(args) {
        // @params: args.transport, remote_id,
        //          args.eval_code || args.selector || args.xpath
        if(!my.defined(args.transport)) {
            throw "transport parameter is mandatory";
        }
        if(!my.defined(args.remote_id)) {
            throw "remote_id parameter is mandatory";
        }
        this.transport = args.transport;
        this.remote_id = args.remote_id;
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
    myclass.prototype = {
        _getEvalCode: function() { return this.eval_code; },
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
                remote_id: self.remote_id, callback: handler
            };
            self.transport.selectAndListen(transport_args);
            return self;
        },
        each: function(handler) {
            var self = this;
            if(!my.defined(handler)) {
                throw "handler parameter is mandatory";
            }
            var loop_enabled = true;
            self.transport.selectAndListen({
                eval_code: self._getEvalCode(),
                method: "each", remote_id: self.remote_id,
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
            return self;
        },
        off: function(events, selector) {
            var args_str = my.defined(selector) ? my.argumentsStringFor([events, selector])
                                                : my.argumentsStringFor([events]);
            this.transport.selectAndGet({
                eval_code: this._getEvalCode() + ".off("+ args_str +")",
                remote_id: this.remote_id
            });
            return this;
        },
    };

    var selectionMethod = function(method_name) {
        myclass.prototype[method_name] = function() {
            return new myclass({
                transport: this.transport, remote_id: this.remote_id,
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
                remote_id: this.remote_id, eval_code: eval_code
            });
            if(arguments.length <= max_arg_get) {
                return select_result;
            }else {
                return this;
            }
        };
    };
    $.each([
        ["attr", 1, 1], ["hasClass", 1, 1], ["val", 0, 0], ["css", 1, 1],
        ["height", 0, 0], ["innerHeight", 0, 0], ["innerWidth", 0, 0], ["outerHeight", 0, 1],
        ["outerWidth", 0, 1], ["width", 0, 0], ["data", 1, 1], ["text", 0, 0],
        ["index", 0, 1], ["size", 0, 0],
    ], function(i, method_spec) {
        accessorMethod.apply(null, method_spec);
    });

    var animationMethod = function(method_name) {
        myclass.prototype[method_name] = function() {
            var self = this;
            var args = my.argsToArray(arguments);
            var callback = null;
            var eval_code = self._getEvalCode();
            if(args.length > 0 && $.isFunction(args[args.length-1])) {
                callback = args.pop();
            }
            if(my.defined(callback)) {
                self.transport.selectAndListen({
                    eval_code: eval_code,
                    remote_id: self.remote_id,
                    method: method_name,
                    options: args,
                    callback: callback
                });
            }else {
                eval_code += "."+ method_name +"("+ my.argumentsStringFor(args) +")";
                self.transport.selectAndGet({
                    eval_code: eval_code,
                    remote_id: self.remote_id
                });
            }
            return self;
        };
    };
    $.each(["animate", "fadeIn", "fadeTo", "fadeOut", "hide", "show"], function(i, method_name) {
        animationMethod(method_name);
    });

})(jQluster, jQuery);

// We need another front-end library like "jQluster functional" or something??
// or, it is rather "RemoteSelectorFactory".
