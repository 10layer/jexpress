var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var ProductTypeSchema   = new Schema({
	name: { type: String, required: true, index: true },
	fire_action: String,
	price_recommendation_formula: String,
	bookable: { type: Boolean, default: false },
	bookable_noun: String,
	bookable_time_units: Number,
	_owner_id: Objectid,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

ProductTypeSchema.set("_perms", {
	setup: "crud",
	admin: "r",
	all: "r"
});

module.exports = mongoose.model('ProductType', ProductTypeSchema);
