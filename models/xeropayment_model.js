const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;

const Organisation = require("./organisation_model");
const Location = require("./location_model");
const Invoice = require("./invoice_model");

const XeropaymentSchema = new Schema({
    payment_id: String,
    date: Date,
    bank_amount: Number,
    amount: Number,
    reference: String,
    currency_rate: Number,
    payment_type: String,
    status: String,
    updated_date_utc: { type: Date, index: true },
    has_account: Boolean,
    is_reconciled: Boolean,
    account: Mixed,
    invoice: Mixed,
    invoice_id: { type: ObjectId, ref: "Invoice", index: true },
    organisation_id: { type: ObjectId, ref: "Organisation", index: true },
    location_id: { type: ObjectId, ref: "Location", index: true },
    xero_tenant_id: String,
    _owner_id: ObjectId
}, {
    timestamps: true
});

XeropaymentSchema.set("_perms", {
    admin: "crud",
    owner: "crud",
    user: "",
    all: ""
});

module.exports = mongoose.model('Xeropayment', XeropaymentSchema);
