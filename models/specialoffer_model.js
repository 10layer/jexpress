var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var Location = require("./location_model");

var SpecialofferSchema   = new Schema({
	name: { type: String, unique: true, index: true },
	img: String,
	description: String, // Short description
	body: String, // Page body
	link: String,
	partner: String,
	partner_code: String,
	locations: [ { type: ObjectId, ref: "Location" } ],
	date: { type: Date, default: Date.now, required: true, index: true },
	start_date: { type: Date, default: Date.now, index: true },
	end_date: { type: Date, default: Date.now, index: true },
}, {
	timestamps: true
});

SpecialofferSchema.set("_perms", {
	manager: "cru",
	line_manager: "crud",
	finance: "crud",
	admin: "r",
	all: "r"
});

SpecialofferSchema.index( { "$**": "text" } );

function toLower (v) {
	return v.toLowerCase();
}

module.exports = mongoose.model('Specialoffer', SpecialofferSchema);
