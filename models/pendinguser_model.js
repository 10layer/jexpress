var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var PendinguserSchema   = new Schema({
	name: String,
	organisation: String,
	organisation_id: { type: Objectid, ref: "Organisation" },
	location_id: Objectid,
	email: { type: String, unique: true, index: true },
	mobile: String,
	password: String,
	referee: String,
	referal_method: String,
	url: String,
	newsletter: Boolean,
	otp: { type: String, get: function(otp) {
		return "<obfuscated>";
		}
	}
}, {
	timestamps: true
});

PendinguserSchema.set("_perms", {
	manager: "crud",
	admin: "r",
	owner: "crd",
	user: "r",
	all: "c",
});



// PendinguserSchema.statics.confirm(function(data) {
// 	var User = require("./user_model");

// });

PendinguserSchema.pre("save", function(next) {
	var pendinguser = this;
	this.otp = require('rand-token').generate(16);
	next();
});



module.exports = mongoose.model('Pendinguser', PendinguserSchema);
