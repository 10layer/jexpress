var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;
var config		= require("config");

var ObjectId = mongoose.Schema.Types.ObjectId;

var ScheduleSchema   = new Schema({
	name: String,
	id: { type: ObjectId, index: true },
	description: String,
	action: String,
	due: { type: Date, index: true },
	status: { type: String, validate: /due|running|run|cancelled|failed/, index: true, default: "due" },
	last_run: Date,
	last_output: mongoose.Schema.Types.Mixed,
	repeat:  { type: String, validate: /never|minutely|hourly|daily|monthly/, index: true, default: "never" },
	created: { type: Date, default: Date.now },
}, {
	timestamps: true
});

ScheduleSchema.set("_perms", {
	// Very NB to keep these permissions tight, because we execute code from here
	super_user: "cru",
	manager: "cr",
	admin: "r"
});

ScheduleSchema.index( { "$**": "text" } );

module.exports = mongoose.model('Schedule', ScheduleSchema);
