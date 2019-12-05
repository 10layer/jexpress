var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Organisation = require('./organisation_model');
var User = require("./user_model");
var Event = require("./event_model");

var InvoiceHolidaySchema = new Schema({
	organisation_id: { type: ObjectId, index: true, ref: "Organisation" },
	start_date: Date,
	end_date: Date,
	date_created: { type: Date, default: Date.now },
	reason: String,
	_owner_id: ObjectId,
    _deleted: Boolean,
}, {
	timestamps: true
});

InvoiceHolidaySchema.set("_perms", {
	finance: "crud",
	admin: "r",
	owner: "r",
	user: ""
});

module.exports = mongoose.model('InvoiceHoliday', InvoiceHolidaySchema);
