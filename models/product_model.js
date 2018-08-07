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
	member_discount: { type: Number, default: 0 },
	topup_size: Number,
	volume: Number,
	xero_account: String,
	xero_code: { type: String, index: true },
	xero_id: String,
	payment_options: [ { type: String, validate: /stuff|space|creditcard|account/, required: true } ],
	self_service: { type: Boolean, default: false, index: true },
	date_created: { type: Date, default: Date.now },
	recurring_cost: { type: String, validate: /once-off|monthly|annually/, default: "monthly" },
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
});

ProductSchema.set("_perms", {
	admin: "crud",
	owner: "r",
	user: "r",
	all: "r"
});


module.exports = mongoose.model('Product', ProductSchema);
