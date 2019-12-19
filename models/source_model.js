var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var SourceSchema   = new Schema({
	user_id: { type: Objectid, index: true, ref: "User" },
	organisation_id: { type: Objectid, index: true, ref: "Organisation" },
	description: String,
	_deleted: { type: Boolean, default: false, index: true },
	_owner_id: Objectid
}, {
	timestamps: true
});

SourceSchema.set("_perms", {
	setup: "crud",
	manager: "r",
	admin: "r",
	user: ""
});
