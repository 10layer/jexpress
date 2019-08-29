const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const friendly = require("mongoose-friendly");

const ObjectId = mongoose.Schema.Types.ObjectId;
const Location = require("./location_model");
const Layout = require("./layout_model");
const Space = require("./space_model");
const Product = require("./product_model");

const RoomSchema = new Schema({
	urlid: { type: String, unique: true, index: true },
	location_id: { type: ObjectId, ref: "Location", index: true },
	product_id: { type: ObjectId, ref: "Product" },
	type: [{ type: String, validate: /meeting|event|office|other|hot_desk|dedicated_desk/, index: true } ],
	name: String,
	img: String,
	cost: Number,
	off_peak_cost: Number,
	description: String,
	capacity: Number,
	meters_squared: Number,
	layout: [{ type: ObjectId, ref: "Layout" }],
	private: { type: Boolean, default: false },
	unavailable_reason: String, 
	external_ical: String,
	half_day_discount: Number,
	full_day_discount: Number,
	price_per_user_per_day: Number,
	price_per_day: Number,
	start_price_per_square_meter: Number,
	aesthetic: String,
	aesthetic_impact: Number,
	safety_margin: Number,
	price_per_room: Number,
	_deleted: { type: Boolean, default: false, index: true },
	_owner_id: ObjectId,
}, {
	timestamps: true
});

RoomSchema.plugin(friendly, {
	source: 'name',
	friendly: 'urlid'
});

RoomSchema.set("_perms", {
	admin: "crud",
	user: "r"
});

module.exports = mongoose.model("Room", RoomSchema);
