var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require("./location_model");
var Clayaccessgroup = require("./clayaccessgroup_model");

var MembershipSchema   = new Schema({
	name: String,
	location_id: { type: ObjectId, ref: 'Location' },
	space_credits_per_month: Number,
	stuff_credits_per_month: Number,
	print_credits_per_month: Number,
	description: String,
	marketing_description: String,
	cost: Number,
	cost_extra_member: Number,
	radius_service: String,
	papercut_group: String,
	xero_account: String,
	xero_itemid: String,
	occupancy_type: { type: String, validate: /hotdesk|dedicated_desk|dedicated_office|occasional|other/, default: "hotdesk" },
	clay_access_group: { type: ObjectId, ref: "Clayaccessgroup" },
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

MembershipSchema.set("_perms", {
	admin: "r",
	all: "r",
	setup: "crud",
});

module.exports = mongoose.model('Membership', MembershipSchema);
