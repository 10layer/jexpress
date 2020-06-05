const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require("config");

const ObjectId = mongoose.Schema.Types.ObjectId;
const User = require("./user_model");
const Location = require('./location_model');

const DeskBookingSchema = new Schema({
    location_id: { type: ObjectId, ref: "Location", index: true },
    user_id: [{ type: ObjectId, ref: "User" }],
    date: { type: Date, required: true, index: true },
    period: { type: String, required: true, index: true, validate: /morning|afternoon/ },
    _owner_id: ObjectId,
    _version: { type: Number, default: 0 },
}, {
    timestamps: true
});

DeskBookingSchema.set("_perms", {
    admin: "crud",
    owner: "crud",
    user: "cru",
});

module.exports = mongoose.model('DeskBooking', DeskBookingSchema);
