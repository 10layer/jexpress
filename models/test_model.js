var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var TestSchema   = new Schema({
	foo: String,
	bar: String,
	yack: Mixed,
	shmack: [String],
	_owner_id: Objectid
});

TestSchema.set("_perms", {
	admin: "crud",
	owner: "crud",
	user: "cr",
	all: "r"
});

TestSchema.statics.test = function() {
	return "Testing OKAY!";
};

module.exports = mongoose.model('Test', TestSchema);