var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var ProductTypeSchema   = new Schema({
	name: { type: String, required: true, index: true },
	fire_action: String,
	price_recommendation_formula: String,
	_owner_id: Objectid,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

ProductTypeSchema.set("_perms", {
	finance: "cru",
	setup: "crud",
	admin: "r",
	all: "r"
});

module.exports = mongoose.model('ProductType', ProductTypeSchema);
