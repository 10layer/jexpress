var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var TokenSchema   = new Schema({
	user_id: { type: Objectid, index: true },
	provider: String,
	access_token: String,
	token_type: String,
	expires_in: Number,
	created: { type: Date, default: Date.now },
	_owner_id: Objectid,
}, {
	timestamps: true
});

TokenSchema.set("_perms", {
	api: "crud",
	manager: "r",
	admin: "r",
	owner: "crud"
});

module.exports = mongoose.model('Token', TokenSchema);
