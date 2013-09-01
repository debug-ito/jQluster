"use strict";

// requires: jquery, jquery.ellocate

if(!jQluster) { var jQluster = {}; }

(function(my) {
    my.uuid = function() {
        // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };

    my.argsToArray = function(arguments_object) {
        return Array.prototype.slice.call(arguments_object, 0);
    };

    my.clone = function(obj) {
        return $.extend(true, {}, obj);
    };

    my.cloneViaJSON = function(obj) {
        return JSON.parse(JSON.stringify(obj));
    };

    my.defined = function(val) {
        return (val !== null && typeof(val) !== 'undefined');
    };

    my.xpathFor = function($jquery_object) {
        // https://github.com/bimech/ellocate.js
        return $jquery_object.ellocate().xpath;
    };

    my.isHTMLElement = function(obj) {
        // ** http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
        return (typeof HTMLElement === "object"
                ? obj instanceof HTMLElement
                : obj && typeof obj === "object" && obj !== null && obj.nodeType === 1 && typeof obj.nodeName==="string");
    };

    my.quoteString = function(str) {
        str = "" + str;
        return '"' + str.replace('"', '\\"')  + '"';
    };

    my.argumentsStringFor = function(args) {
        return $.map(my.argsToArray(args), function(arg) {
            return arg === null ? "null"
                : arg === undefined ? "undefined"
                : arg === true ? "true"
                : arg === false ? "false"
                : typeof arg === "number" ? arg
                : JSON.stringify(arg);
                // : ($.isPlainObject(arg) || $.isArray(arg)) ? JSON.stringify(arg)
                // : my.quoteString(arg)
        }).join(",");
    };
})(jQluster);
