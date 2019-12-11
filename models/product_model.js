var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var ProductType = require("./producttype_model");
var Location = require("./location_model");

var ProductSchema   = new Schema({
	name: String,
	description: String,
	location_id: { type: ObjectId, ref: 'Location' },
	producttype_id: { type: ObjectId, ref: 'ProductType' },
	price: { type: Number, validate: function(v) { return (v > 0); }, required: true },
	price_customisable: { type: Boolean, default: false },
	member_discount: { type: Number, default: 0 },
	topup_size: Number,
	volume: Number,
	xero_account: String,
	xero_code: { type: String, index: true },
	xero_id: String,
	xero_tax_type: String,
	tax_rate: Number,
	payment_options: [ { type: String, validate: /stuff|space|creditcard|account/, required: true } ],
	self_service: { type: Boolean, default: false, index: true },
	date_created: { type: Date, default: Date.now },
	pro_rata: { type: Boolean, default: false, index: true },
	amortise_months: Number,
	purchase_price: Number,
	markup: Number,
	price_updated_date: Date,
	image: String,
	supplier_name: String,
	supplier_sku: String,
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

ProductSchema.set("_perms", {
	setup: "crud",
	finance: "crud",
	admin: "r",
	all: "r"
});

ProductSchema.index( { "$**": "text" } );

module.exports = mongoose.model('Product', ProductSchema);
