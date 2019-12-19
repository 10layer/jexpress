var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Tag = require("./tag_model");

var TrackSchema   = new Schema({
	name: String,
	tag_id: [{ type: ObjectId, index: true, ref: "Tag" }],
	tasks: [{
		name: String,
		category: { type: String, validate: /call|email|follow_up|meeting|milestone|site_visit/, index: true, default: "email" },
		due_after_event: { type: String, validate: /track_start|last_task/, index: true, default: "last_task" },
		due_after_days: Number,
	}],
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId
}, {
	timestamps: true
});

TrackSchema.set("_perms", {
	setup: "crud",
	manager: "r",
	admin: "r"
});

module.exports = mongoose.model('Track', TrackSchema);
