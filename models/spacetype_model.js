var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;

var SpaceTypeSchema   = new Schema({
	name: String,
	xero_account: String,
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

SpaceTypeSchema.set("_perms", {
	setup: "crud",
	admin: "r",
	user: "r"
});

SpaceTypeSchema.index( { "$**": "text" } );

module.exports = mongoose.model('SpaceType', SpaceTypeSchema);
