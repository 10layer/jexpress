const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const friendly = require("mongoose-friendly");
const Membership = require("./membership_model");

const ProductTypeSchema   = new Schema({
	name: { type: String, required: true, index: true },
	urlid: { type: String, unique: true, index: true },
	fire_action: String,
	price_recommendation_formula: String,
	bookable: { type: Boolean, default: false },
	bookable_noun: String,
	bookable_time_units: String,
	bookable_start: Number,
	bookable_end: Number,
	bookable_prime_start: Number,
	bookable_prime_end: Number,
	bookable_discounts: [{
		name: String,
		membership_types: [{ type: ObjectId, ref: "Membership" }],
		slot: Number
	}],
	img: String,
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

ProductTypeSchema.plugin(friendly, {
	source: 'name',
	friendly: 'urlid'
});

ProductTypeSchema.set("_perms", {
	setup: "crud",
	admin: "r",
	all: "r"
});

module.exports = mongoose.model('ProductType', ProductTypeSchema);
