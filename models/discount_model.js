var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;
var ObjectId     = mongoose.Schema.Types.ObjectId;
var Organisation = require("./organisation_model");
var LineItem     = require("./lineitem_model");
var ProductType     = require("./producttype_model");

var DiscountSchema   = new Schema({
	date_created: { type: Date, default: Date.now },
    discount: { type: Number, default: 0 },
    description: String,
    organisation_id: { type: ObjectId, ref: "Organisation" },
    producttype_id: { type: ObjectId, ref: "ProductType", default: null, index: true },
    lineitem_id: { type: ObjectId, ref: "LineItem" }, // If left blank, apply to entire organisation
    date_start: { type: Date, default: Date.now },
    date_end: Date,
    apply_to: [ { type: String, validate: /product|license|booking|all/ } ], // For organisation-wide discounts
	_owner_id: ObjectId,
	_version: { type: Number, default: 0 },
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

DiscountSchema.set("_perms", {
    finance: "crud",
    line_manager: "crud",
    admin: "r"
});

module.exports = mongoose.model('Discount', DiscountSchema);
