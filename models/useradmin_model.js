var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var UserAdminSchema   = new Schema({
	user_id: { type: Objectid, unique: true, index: true },
	extra_credits: Number,
	_owner_id: Objectid,
}, {
	timestamps: true
});

UserAdminSchema.set("_perms", {
	manager: "cru",
	admin: "r",
	owner: "cr",
	user: "",
});

module.exports = mongoose.model('UserAdmin', UserAdminSchema);
