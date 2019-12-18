var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Organisation = require("./organisation_model");

var OrganisationAttachmentSchema   = new Schema({
	filename: String,
	original_filename: String,
	description: String,
	type: String,
	organisation_id: { type: ObjectId, ref: 'Organisation' },
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

OrganisationAttachmentSchema.set("_perms", {
	manager: "crud",
	admin: "r",
	finance: "cru",
	super_user: "crud",
	owner: "r",
});


module.exports = mongoose.model('OrganisationAttachment', OrganisationAttachmentSchema);
