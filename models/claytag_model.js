var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');
var User = require("./user_model");

var ClaytagSchema   = new Schema({
	id: { type: String, index: true },
	number: Number,
	is_assigned: Boolean,
	system: mongoose.Schema.Types.Mixed,
	location_id: { type: ObjectId, index: true, ref: "Location" },
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId
}, {
	timestamps: true
});

ClaytagSchema.set("_perms", {
	manager: "crud",
	admin: "-"
});

module.exports = mongoose.model('Claytag', ClaytagSchema);
