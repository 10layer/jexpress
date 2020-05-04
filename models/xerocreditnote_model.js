const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;
const Organisation = require("./organisation_model");
const Location = require("./location_model");

const XerocreditnoteSchema = new Schema({
    contact: Mixed,
    date: Date,
    status: String,
    line_amount_types: String,
    sub_total: Number,
    total_tax: Number,
    total: Number,
    updated_date_utc: Date,
    currency_code: String,
    fully_paid_on_date: Date,
    type: String,
    credit_note_id: String,
    credit_note_number: String,
    currency_rate: Number,
    remaining_credit: Number,
    allocations: [Mixed],
    organisation_id: { type: ObjectId, ref: "Organisation", index: true },
    location_id: { type: ObjectId, ref: "Location", index: true },
    xero_tenant_id: String,
    _owner_id: ObjectId
}, {
    timestamps: true
});

XerocreditnoteSchema.set("_perms", {
    admin: "crud",
    owner: "crud",
    user: "",
    all: ""
});

module.exports = mongoose.model('Xerocreditnote', XerocreditnoteSchema);
