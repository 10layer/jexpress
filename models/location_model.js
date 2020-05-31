var mongoose = require("mongoose");
var Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Product = require("./product_model");

var friendly = require("mongoose-friendly");

var LocationSchema = new Schema({
	name: String,
	urlid: { type: String, index: { unique: true, partialFilterExpression: { urlid: { $type: 'string' } } } },
	active: { type: Boolean, default: true, index: true },
	city: String,
	address: String,
	img: String,
	website: String,
	description: String,
	email: String,
	bank_account: String,
	bank_code: String,
	community_manager_name: String,
	community_manager_email: String,
	community_manager_tel: String,
	mail_template: String,
	map_img: String,
	access_instructions: String,
	map_link: String,
	xero_paypal_id: String,
	xero_creditcard_id: String,
	xero_eft_id: String,
	xero_tax_type: String,
	xero_tracking_name: String,
	xero_branding_theme: String,
	xero_tenant_id: String,
	deposit_product_id: { type: ObjectId, ref: "Product" },
	clay_id: String,
	nas_ip: String,
	operator: String,
	contract_template: String,
	contract_addendum: String,
	contract_prepend: String,
	proposal_template: String,
	proposal_addendum: String,
	proposal_prepend: String,
	flexi_agreement_template: String,
	
	: String,
	flexi_agreement_prepend: String,
	what3words: [ String ],
	_deleted: { type: Boolean, default: false, index: true }
}, {
	timestamps: true
});

LocationSchema.set("_perms", {
	setup: "crud",
	super_user: "crud",
	admin: "r",
	user: "r",
	all: "r",
});

LocationSchema.plugin(friendly, {
	source: 'name',
	friendly: 'urlid',
	addIndex: false,
	findById: true
});

module.exports = mongoose.model("Location", LocationSchema);
