var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;
var User = require("./user_model.js");

var LogSchema   = new Schema({
	date_created: { type: Date, default: Date.now },
	id: { type: ObjectId, index: true },
	code: String,
	model: String,
	level: Number, // 1=Error, 2=Warning, 3=Info, 4=Debug
	user_id: { type: ObjectId, ref: "User" },
	title: String,
	message: String,
	data: Mixed,
}, {
	timestamps: true
});

LogSchema.set("_perms", {
	admin: "r",
	api: "cru",
	user: "c",
});

LogSchema.index( { "$**": "text" } );

module.exports = mongoose.model('Log', LogSchema);
