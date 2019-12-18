var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;
var Membership = require('./membership_model');
var Location = require('./location_model');
var User = require('./user_model');

var PendingOrganisationSchema   = new Schema({
	name: { type: String, unique: true, index: true },
	user_name: String,
	tel: String,
	mobile: String,
	email: String,
	website: String,
	address: String,
	twitter: String,
	facebook: String,
	linkedin: String,
	img: String,
	about: String,
	user_id: { type: Objectid, ref: 'User' },
	sage_uid: Number,
	vat: String,
	location_id: { type: Objectid, ref: 'Location' },
	membership: { type: Objectid, ref: 'Membership' },
	membership_type: String,
	space_credits_per_month_override: Number,
	stuff_credits_per_month_override: Number,
	bandwidth_per_month_override: Number,
	cost_per_month_override: Number,
	data: Schema.Types.Mixed,
	_owner_id: Objectid,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

PendingOrganisationSchema.set("_perms", {
	manager: "crud",
	admin: "r",
	owner: "crud",
	user: "c",
	all: "c"
});

module.exports = mongoose.model('PendingOrganisation', PendingOrganisationSchema);
