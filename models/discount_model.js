const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;
const ObjectId     = mongoose.Schema.Types.ObjectId;
const Organisation = require("./organisation_model");
const LineItem     = require("./lineitem_model");
const ProductType  = require("./producttype_model");
const User         = require("./user_model");
const diff         = require('deep-diff').diff;
const Log          = require("./log_model");

const DiscountSchema   = new Schema({
	date_created: { type: Date, default: Date.now },
    discount: { type: Number, default: 0 },
    description: String,
    organisation_id: { type: ObjectId, ref: "Organisation" },
    producttype_id: { type: ObjectId, ref: "ProductType", default: null, index: true },
    lineitem_id: { type: ObjectId, ref: "LineItem" }, // If left blank, apply to entire organisation
    date_start: { type: Date, default: Date.now, max: '9999-12-31', min: '1800-01-01' },
    date_end: { type: Date, max: '9999-12-31', min: '1800-01-01' },
    apply_to: [ { type: String, validate: /product|license|booking|all/ } ], // For organisation-wide discounts
	_owner_id: { type: ObjectId, ref: "User" },
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

/*
 * Log changes
 */
DiscountSchema.post('validate', async function(doc) {
    const self = this;
    try {
        const Organisation = require("./organisation_model");
        const organisation = await Organisation.findOne({ _id: doc.organisation_id });
        let message = `${doc.discount}% discount created for ${organisation.name}`;
        console.log(self.sender);
        log = new Log({
            id: doc.organisation_id,
            model: "organisation",
            level: 3,
            user_id: doc._owner_id,
            title: `Discount created`,
            message,
            code: "discount-create",
            data: doc,
        }).save();
    } catch(err) {
        console.error(err);
    }
});

DiscountSchema.virtual("__user").set(function (user) {
    this.sender = user;
});

module.exports = mongoose.model('Discount', DiscountSchema);
