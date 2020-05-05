const axios = require("axios");
var async = require("async");

var count = 5000;
var queue = [];

var testFunc = function(cb) {
	// Add authentication to see a massive slow-down
	axios.get("http://localhost:3001/api/location")
	.then(function(result) {
		cb(null);
	}, function(err) {
		console.error(err);
		cb(err);
	});
};

for (var x = 0; x < count; x++) {
	queue.push(testFunc);
}
var startTime = +new Date();
// change to parallel for some fun
async.series(queue, function(result) {
	var endTime = +new Date();
	var diff = endTime - startTime;
	console.log("Time: " + diff + "ms, Per Second: " + (count / (diff / 1000)));
});