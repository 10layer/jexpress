var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');

var ClaylockSchema   = new Schema({
	id: { type: String, index: true },
	door_left_open: Boolean,
	intrusion: Boolean,
	lock_type: String,
	mac_address: String,
	created: Date,
	last_edited: Date,
	customer_reference: String,
	is_online: Boolean,
	locked_status: String,
	in_easy_office_mode: Boolean,
	image_url: String,
	has_camera: Boolean,
	battery: String,
	system: mongoose.Schema.Types.Mixed,
	iq: mongoose.Schema.Types.Mixed,
	repeater: mongoose.Schema.Types.Mixed,
	location_id: { type: ObjectId, index: true, ref: "Location" },
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId
}, {
	timestamps: true
});

ClaylockSchema.set("_perms", {
	manager: "crud",
	admin: "-"
});

module.exports = mongoose.model('Claylock', ClaylockSchema);
