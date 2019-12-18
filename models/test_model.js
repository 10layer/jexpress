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
}, {
	timestamps: true
});

TestSchema.set("_perms", {
	manager: "crud",
	admin: "r",
	owner: "crud",
	user: "cr",
	all: "r"
});

TestSchema.statics.test = function() {
	return "Testing OKAY!";
};

module.exports = mongoose.model('Test', TestSchema);
