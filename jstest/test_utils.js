
var is = strictEqual;

var delay = function(delay_sec, routine) {
    var deferred = $.Deferred();
    setTimeout(function() {
        if(routine) routine();
        deferred.resolve();
    }, delay_sec);
    return deferred.promise();
};


