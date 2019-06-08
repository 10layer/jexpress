var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require("./location_model");
var Layout = require("./layout_model");
var Space = require("./space_model");
var Product = require("./product_model");

var RoomSchema = new Schema({
	location: { type: ObjectId, ref: "Location" },
	product_id: { type: ObjectId, ref: "Product" },
	name: String,
	img: String,
	cost: Number,
	off_peak_cost: Number,
	description: String,
	capacity: Number,
	meters_squared: Number,
	layout: [{ type: ObjectId, ref: "Layout" }],
	space_id: { type: ObjectId, ref: "Space" },
	private: { type: Boolean, default: false },
	unavailable_reason: String,
	display_device_id: String,
	external_ical: String,
	zar_cost: Number,
	market_pax: Number,
	_deleted: { type: Boolean, default: false, index: true }
}, {
	timestamps: true
});

RoomSchema.set("_perms", {
	admin: "crud",
	user: "r"
});

RoomSchema.index( { "$**": "text" } );

module.exports = mongoose.model("Room", RoomSchema);
