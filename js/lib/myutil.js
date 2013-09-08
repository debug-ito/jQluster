"use strict";

// ** just a utility library
// ** Toshio Ito (c) 2013

var myutil = {};

(function(my) {
    // ** http://stackoverflow.com/questions/5499078/fastest-method-to-escape-html-tags-as-html-entities
    var ESCAPE_CHARS = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    var _escape =  function(c) {
        return ESCAPE_CHARS[c] || c;
    };
    my.htmlEscape = function(str) {
        return str.replace(/[&<>]/g, _escape);
    };
})(myutil);

