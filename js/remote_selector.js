"use strict";

// jQluster remote selector representation
// requires: jquery, util.js

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

})(jQluster, jQuery);

// TODO: Implement .filter(func) and .map(func). Not so trivial.

// We need another front-end library like "jQluster functional" or something??
// or, it is rather "RemoteSelectorFactory".