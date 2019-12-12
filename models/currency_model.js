var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;

var CurrencySchema   = new Schema({
	name: String,
	exchange_rate: Number,
	unit: String,
	products: [ ObjectId ],
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId
}, {
	timestamps: true
});

CurrencySchema.set("_perms", {
	setup: "crud",
	admin: "r",
	owner: "cr",
	user: "r"
});

module.exports = mongoose.model('Currency', CurrencySchema);
