var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');
var Organisation = require('./organisation_model');

var XeroOrgAccountSchema   = new Schema({
	location_id: { type: ObjectId, ref: 'Location' },
	organisation_id: { type: ObjectId, ref: 'Organisation', index: true },
	xero_id: String
}, {
	timestamps: true
});

XeroOrgAccountSchema.set("_perms", {
	super_user: "crud",
	admin: "crud",
	user: "r",
	all: ""
});

module.exports = mongoose.model('XeroOrgAccount', XeroOrgAccountSchema);
