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
	admin: "cr",
	finance: "crud",
	owner: "r",
});


module.exports = mongoose.model('OrganisationAttachment', OrganisationAttachmentSchema);
