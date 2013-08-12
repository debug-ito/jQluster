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
        _getEvalCode: function() { return this.eval_code; }
    };

    var selectionMethod = function(method_name) {
        myclass.prototype[method_name] = function() {
            var i;
            var arg;
            var quoted_args = [];
            for(i = 0 ; i < arguments.length ; i++) {
                arg = arguments[i];
                quoted_args.push(
                                     arg === null ? "null"
                              : arg === undefined ? "undefined"
                        : typeof arg === "number" ? arg
                                                  : my.quoteString(arg)
                );
            }
            return new myclass({
                transport: this.transport, remote_id: this.remote_id,
                eval_code: this.eval_code + "." + method_name + "("+ quoted_args.join(",") +")"
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



    
})(jQluster, jQuery);

// TODO: Implement .filter(func) and .map(func). Not so trivial.

// We need another front-end library like "jQluster functional" or something??
// or, it is rather "RemoteSelectorFactory".
