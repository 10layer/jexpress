var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Organisation = require("./organisation_model");

// Account Types //
/* Public Recipient 1
 * Current (cheque/bond) account 1
 * Savings account 2
 * Transmission account 3
 * Bond Account 4
 * Subscription Share Account 6
 * FNB Card Account F
 * WesBank W
*/

var BankaccountSchema   = new Schema({
	organisation_id: { type: ObjectId, ref: "Organisation", required: true, index: true },
	name: String, // What the user wants to call it, eg. "Business Account"
	account_name: { type: String, required: true }, // Name the account is under
	account_number: { type: String, required: true },
	account_type: { type: Number, required: true }, // 1. Cheque, 2. Savings, 3. Transmission, 4. Bond
	branch_code: { type: String, requred: true },
	start_date: { type: Date, default: Date.now, index: true },
	end_date: Date,
	filename: String,
	date_created: { type: Date, default: Date.now, index: true },
	_version: { type: Number, default: 0 },
	// _deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

BankaccountSchema.set("_perms", {
	finance: "crud",
	manager: "r",
	admin: "r",
	user: "c",
	all: ""
});

module.exports = mongoose.model('Bankaccount', BankaccountSchema);
