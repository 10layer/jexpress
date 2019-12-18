var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var User = require("./user_model");
var Tag = require("./tag_model");

var CrmnoteSchema   = new Schema({
	organisation_id: { type: ObjectId, index: true },
	id: { type: ObjectId, index: true },
	note: String,
	date_created: { index: true, type: Date, default: Date.now },
	tag_id: [ { type: ObjectId, ref: "Tag" }],
	_owner_id: { type: ObjectId, ref: "User" }
}, {
	timestamps: true
});

CrmnoteSchema.set("_perms", {
	finance : "crud",
	line_manager: "cru",
	admin: ""
});

module.exports = mongoose.model('Crmnote', CrmnoteSchema);
