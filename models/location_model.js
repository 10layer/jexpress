var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var friendly = require("mongoose-friendly");

var LocationSchema = new Schema({
	name: String,
	urlid: { type: String, index: { unique: true, partialFilterExpression: { urlid: { $type: 'string' } } } },
	active: { type: Boolean, default: true, index: true },
	city: String,
	address: String,
	img: String,
	description: String,
	email: String,
	bank_account: Number,
	bank_code: String,
	community_manager_name: String,
	community_manager_email: String,
	community_manager_tel: String,
	mail_template: String,
	xero_paypal_id: String,
	xero_creditcard_id: String,
	xero_eft_id: String,
	xero_tax_type: String,
	xero_tracking_name: String,
	xero_branding_theme: String,
	clay_id: String,
	nas_ip: String,
	_deleted: { type: Boolean, default: false, index: true }
}, {
	timestamps: true
});

LocationSchema.set("_perms", {
	admin: "r",
	user: "r",
	all: "r",
	setup: "crud",
});

LocationSchema.plugin(friendly, {
	source: 'name',
	friendly: 'urlid',
	addIndex: false,
	findById: true
});

module.exports = mongoose.model("Location", LocationSchema);
