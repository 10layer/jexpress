var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');
var User = require("./user_model");
var Event = require("./event_model");

var CateringSchema   = new Schema({
	location_id: { type: ObjectId, index: true, ref: "Location" },
	booking_id: { type: ObjectId, index: true, ref: "Booking" },
	room_id: [{ type: ObjectId, index: true, ref: "Room" }],
	event_id: { type: ObjectId, index: true, ref: "Event" },
	status: String,
	name: String,
	description: String,
	start_date: Date,
	end_date: Date,
	pax: Number,
	cost: Number,
	date_created: { type: Date, default: Date.now },
	notes: String,
	_owner_id: ObjectId
}, {
	timestamps: true
});

CateringSchema.set("_perms", {
	manager: "crud",
	admin: "",
	owner: "cr",
	user: ""
});

module.exports = mongoose.model('Catering', CateringSchema);
