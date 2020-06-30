var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;

var UserGroupSchema   = new Schema({
	user_id: { type: ObjectId, ref: "User", index: true, unique: true },
	groups: [String],
	_date: { type: Date, default: Date.now },
}, {
	timestamps: true
});

UserGroupSchema.set("_perms", {
	setup: "crud",
	super_user: "crud",
	admin: "r",
	user: "r",
});

module.exports = mongoose.model('Usergroup', UserGroupSchema);
