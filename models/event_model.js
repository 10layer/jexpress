var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');
var Organisation = require("./organisation_model");
var User = require("./user_model");
var Booking = require("./booking_model");
var Invoice = require("./invoice_model");
var Room = require("./room_model");
var Catering = require("./catering_model");

var EventSchema   = new Schema({
	name: String,
	description: String,
	start_date: Date,
	end_date: Date,
	img: [String],
	wifi_username: String,
	wifi_password: String,
	pax: Number,
	client_name: String,
	organiser_name: String,
	organiser_tel: String,
	organiser_email: String,
	status: String,
	events_company_name: String,
	events_company_tel: String,
	events_company_email: String,
	layout: String,
	invoice_id: { type: ObjectId, index: true, ref: "Invoice" },
	organisation_id: { type: ObjectId, index: true, ref: "Organisation" },
	user_id: { type: ObjectId, index: true, ref: "User" },
	location_id: { type: ObjectId, index: true, ref: "Location" },
	booking_id: { type: ObjectId, index: true, ref: "Booking" },
	room_id: [{ type: ObjectId, index: true, ref: "Room" }],
	catering: [{ type: ObjectId, index: true, ref: "Catering" }],
	date_created: { type: Date, default: Date.now },
	notes: String,
	_owner_id: ObjectId
}, {
	timestamps: true
});

EventSchema.set("_perms", {
	manager: "crud",
	admin: "c",
	owner: "cr",
	user: "r"
});

module.exports = mongoose.model('Event', EventSchema);
