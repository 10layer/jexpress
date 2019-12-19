var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var TagSchema   = new Schema({
	name: { type: String, index: true, set: toLower },
	type: { type: String, index: true }
}, {
	timestamps: true
});

TagSchema.index({name: 1, type: 1}, {unique: true});

TagSchema.set("_perms", {
	setup: "crud",
	api: "crud",
	admin: "cr",
	user: "cr"
});

function toLower (v) {
	return v.toLowerCase();
}

module.exports = mongoose.model('Tag', TagSchema);
