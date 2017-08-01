var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;

var WalletTypeSchema   = new Schema({
	name: String,
	priority: Number,
	topup_period: { type: String, validate: /daily|weekly|monthly|annually/, index: true, default: "active" },
	products: [ ObjectId ],
	rand_value: Number,
	unit: String,
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId
});

WalletTypeSchema.set("_perms", {
	superuser: "crud",
	user: "r"
});

module.exports = mongoose.model('WalletType', WalletTypeSchema);