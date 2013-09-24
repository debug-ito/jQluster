
var is = strictEqual;

var delay = function(delay_sec, routine) {
    var deferred = $.Deferred();
    setTimeout(function() {
        if(routine) routine();
        deferred.resolve();
    }, delay_sec);
    return deferred.promise();
};

var TIMEOUT_MSEC = 3000;

var setTimeLimit = function() {
    return setTimeout(function() {
        ok(false, "It tooks too long.");
        start();
    }, TIMEOUT_MSEC);
};

