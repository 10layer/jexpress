var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var User = require("./user_model");
var Organisation = require("./organisation_model");

var CreditSchema   = new Schema({
	user_id: { type: Objectid, index: true, required: true, ref: "User" },
	organisation_id: { type: Objectid, index: true, ref: "Organisation" },
	description: String,
	details: String,
	date: { type: Date, default: Date.now },
	source_type: String,
	source_id: Objectid,
	amount: { type: Number, validate: function(v) { return (v > 0) }, required: true },
	cred_type: { type: String, validate: /space|stuff/, index: true, required: true },
	email: String,
	_owner_id: Objectid
});

CreditSchema.set("_perms", {
	admin: "crud",
	owner: "r",
	user: "",
});

var _organisation = {};

CreditSchema.pre("save", function(next) {
	var transaction = this;
	User.findOne({ _id: transaction.user_id }, function(err, user) {
		if (err) {
			console.warn("Err", err);
			next(new Error('Insufficient Credit'));
			return;
		}
		if (!user) {
			console.log("Could not find user", transaction.user_id);
			transaction.invalidate("user_id", "could not find user");
			return next(new Error('Could not find user'));
		} else {
			Organisation.findOne({ _id: user.organisation_id }, function(err, organisation) {
				if (err) {
					console.warn("Err", err);
					return next(new Error('Insufficient Credit'));
				}
				if (!organisation) {
					console.log("Could not find organisation", user.organisation_id);
					transaction.invalidate("user_id", "could not find organisation associated with user");
					return next(new Error('could not find organisation associated with user'));
				}
				transaction.organisation_id = organisation._id;
				_organisation = organisation;
				next();
			});
		}
	});
});

CreditSchema.post("save", function(transaction) { //Keep our running total up to date
	console.log("Purchase, update totals");
	Organisation.findOne({ _id: transaction.organisation_id }, function(err, organisation) {
		(transaction.cred_type + "_total" in organisation) ? organisation[transaction.cred_type + "_total"] = organisation[transaction.cred_type + "_total"] + transaction.amount : organisation[transaction.cred_type + "_total"] = transaction.amount;
		(transaction.cred_type + "_credit" in organisation) ? organisation[transaction.cred_type + "_credit"] = organisation[transaction.cred_type + "_credit"] + transaction.amount : organisation[transaction.cred_type + "_credit"] = transaction.amount;
		organisation.save();
	});
				
});

module.exports = mongoose.model('Credit', CreditSchema);

// module.exports = require("./ledger_model");