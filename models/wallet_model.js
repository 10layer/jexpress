var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Currency = require('./currency_model');
var User = require("./user_model");
var Organisation = require("./organisation_model");
var moment = require("moment");

var WalletSchema   = new Schema({
	name: { type: String, required: true, validate: /\S+/ },
	currency_id: { type: ObjectId, index: true, ref: "Currency", required: true },
	priority: { type: Number, required: true },
	quota_frequency: { type: String, validate: /daily|weekly|monthly|annually|never/, index: true, default: "never" },
	quota_amount: { type: Number, default: 0 },
	last_quota_date: { type: Date, index: true, default: Date.now },
	user_id: [{ type: ObjectId, index: true, ref: "User", required: true }],
	organisation_id: { type: ObjectId, index: true, ref: "Organisation" },
	balance: { type: Number, default: 0 },
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId
});

WalletSchema.set("_perms", {
	admin: "crud",
	user: "r",
});

WalletSchema.statics.topup_daily = function() {
	var Wallet = require("./wallet_model");
	var day_ago = moment().subtract(1, "day");
	return Wallet.find({ quota_frequency: "daily", last_quota_date: { $lte: day_ago } })
	.then(wallets => {
		var result = [];
		wallets.forEach(wallet => {
			wallet.balance = wallet.quota_amount;
			wallet.last_quota_date = new Date();
			wallet.save();
			result.push(wallet);
		});
		return result;
	});
};

WalletSchema.statics.topup_weekly = function() {
	var Wallet = require("./wallet_model");
	var day_ago = moment().subtract(1, "week");
	return Wallet.find({ quota_frequency: "weekly", last_quota_date: { $lte: day_ago } })
	.then(wallets => {
		var result = [];
		wallets.forEach(wallet => {
			wallet.balance = wallet.quota_amount;
			wallet.last_quota_date = new Date();
			wallet.save();
			result.push(wallet);
		});
		return result;
	});
};

WalletSchema.statics.topup_monthly = function() {
	var Wallet = require("./wallet_model");
	var day_ago = moment().subtract(1, "month");
	return Wallet.find({ quota_frequency: "monthly", last_quota_date: { $lte: day_ago } })
	.then(wallets => {
		var result = [];
		wallets.forEach(wallet => {
			wallet.balance = wallet.quota_amount;
			wallet.last_quota_date = new Date();
			wallet.save();
			result.push(wallet);
		});
		return result;
	});
};

WalletSchema.statics.topup_annually = function() {
	var Wallet = require("./wallet_model");
	var day_ago = moment().subtract(1, "year");
	return Wallet.find({ quota_frequency: "annually", last_quota_date: { $lte: day_ago } })
	.then(wallets => {
		var result = [];
		wallets.forEach(wallet => {
			wallet.balance = wallet.quota_amount;
			wallet.last_quota_date = new Date();
			wallet.save();
			result.push(wallet);
		});
		return result;
	});
};

module.exports = mongoose.model('Wallet', WalletSchema);