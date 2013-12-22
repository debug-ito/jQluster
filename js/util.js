"use strict";

/**
 * @file Various utility methods for jQluster. These are for internal use only.
 * @author Toshio Ito
 * @requires jQuery
 * @requires jQuery.ellocate
 */

/** @namespace jQluster */
if(!jQluster) { var jQluster = {}; }

(function(my) {
    /**
     * @namespace
     * @lends jQluster
     */
    var utils = {
        uuid: function() {
            // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        },
        argsToArray: function(arguments_object) {
            return Array.prototype.slice.call(arguments_object, 0);
        },
        clone: function(obj) {
            return $.extend(true, {}, obj);
        },
        JSONstringifySafely: function(obj) {
            return JSON.stringify(obj, function(key, value) {
                if($.isWindow(value) || value === document || this === value || my.isHTMLElement(value)) {
                    return undefined;
                }else {
                    return value;
                }
            });
        },
        cloneViaJSON: function(obj) {
            return JSON.parse(my.JSONstringifySafely(obj));
        },

        defined: function(val) {
            return (val !== null && typeof(val) !== 'undefined');
        },

        xpathFor: function($jquery_object) {
            // https://github.com/bimech/ellocate.js
            return $jquery_object.ellocate().xpath;
        },

        isHTMLElement: function(obj) {
            // ** http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
            return (typeof HTMLElement === "object"
                    ? obj instanceof HTMLElement
                    : obj && typeof obj === "object" && obj !== null && obj.nodeType === 1 && typeof obj.nodeName==="string");
        },

        quoteString: function(str) {
            return JSON.stringify("" + str);
        },

        argumentsStringFor: function(args) {
            return $.map(my.argsToArray(args), function(arg) {
                return arg === null ? "null"
                    : arg === undefined ? "undefined"
                    : arg === true ? "true"
                    : arg === false ? "false"
                    : typeof arg === "number" ? arg
                    : JSON.stringify(arg);
            }).join(",");
        }
    };
    $.extend(my, utils);
})(jQluster);
