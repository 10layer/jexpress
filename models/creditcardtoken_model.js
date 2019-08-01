var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;
var User = require("./user_model");
var Organisation = require("./organisation_model");
var Gateway = require("./gateway_model");

var CreditcardtokenSchema   = new Schema({
	gateway_id: { type: ObjectId, ref: 'Gateway', index: true },
	is_default: Boolean,
	token: { type: String, index: true, unique: true },
	user_id: { type: ObjectId, ref: 'User', index: true },
	organisation_id: { type: ObjectId, ref: 'Organisation', index: true },
	card_number: String,
	expiration_date: { type: Date, index: true },
	name_first: String,
	name_last: String,
	email: String,
	response: Mixed,
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

CreditcardtokenSchema.set("_perms", {
	admin: "crud",
	owner: "rud",
});


module.exports = mongoose.model('Creditcardtoken', CreditcardtokenSchema);
