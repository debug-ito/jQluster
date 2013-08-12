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
    
})(jQluster, jQuery);


// We need another front-end library like "jQluster functional" or something??
// or, it is rather "RemoteSelectorFactory".
