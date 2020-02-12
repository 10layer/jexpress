var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;
var moment = require("moment");
var async = require("async");
var ObjectId = mongoose.Schema.Types.ObjectId;
var Currency = require('./currency_model');
var User = require("./user_model");
var Organisation = require("./organisation_model");
var diff = require('deep-diff').diff;
var Log = require("./log_model");

var WalletSchema   = new Schema({
	name: { type: String, required: true, validate: /\S+/, index: true },
	currency_id: { type: ObjectId, index: true, ref: "Currency", required: true },
	priority: { type: Number, required: true },
	quota_frequency: { type: String, validate: /daily|weekly|monthly|annually|never/, index: true, default: "never" },
	quota_amount: { type: Number, default: 0 },
	last_quota_date: { type: Date, index: true, default: Date.now },
	user_id: [{ type: ObjectId, index: true, ref: "User", required: true }],
	organisation_id: { type: ObjectId, index: true, ref: "Organisation" },
	balance: { type: Number, default: 0 },
	date_created: { type: Date, default: Date.now },
	personal: Boolean,
	_owner_id: ObjectId
}, {
	timestamps: true
});

WalletSchema.set("_perms", {
	admin: "r",
	finance: "crud",
	setup: "crud",
	user: "r",
});

WalletSchema.index({ name: 1, user_id: 1 }, { unique: true });

WalletSchema.statics.topup_daily = function() {
	var Wallet = require("./wallet_model");
	var day_ago = moment().startOf("day").format("YYYY-MM-DD");
	console.log({ day_ago });
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
	var day_ago = moment().startOf('month');
	return Wallet.find({ quota_frequency: "monthly", last_quota_date: { $lt: day_ago } })
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

// Set this wallet as the Personal wallet and unset any other wallets for the same currency and user
WalletSchema.statics.set_personal = function(_id) {
	var Wallet = require("./wallet_model");
	var queue = [];
	var wallet = null;
	return Wallet.findOne({ _id })
	.then(result => {
		wallet = result;
		return Wallet.find({ currency: wallet.currency, user_id: wallet.user_id, personal: true });
	})
	.then(wallets => {
		wallets.forEach(w => {
			if (w._id.toString() !== wallet._id.toString()) {
				queue.push(cb => {
					w.personal = false;
					w.save()
					.then(result => {
						cb(null, result);
					}, err => {
						console.error(err);
						cb(err);
					});
				});
			}
		});
		queue.push(cb => {
			wallet.personal = true;
			wallet.save()
			.then(result => {
				cb(null, result);
			}, err => {
				console.error(err);
				cb(err);
			});
		});
		return new Promise((resolve, reject) => {
			async.series(queue, (err, result) => {
				if (err)
					return reject(err);
				return resolve(result);
			});
		});
	});
};

var getWallet = params => {
	return new Promise((resolve, reject) => {
		mongoose.model('Wallet', WalletSchema).findOne(params, (err, result) => {
			if (err)
				return reject(err);
			resolve(result);
		});
	});
};

/*
 * Log changes
 */
WalletSchema.post('validate', async function (doc) {
	const self = this;
	try {
		const original = await getWallet({ _id: doc._id });
		if (!original) {
			new Log({
				id: doc._id,
				model: "wallet",
				level: 3,
				user_id: self.sender._id,
				title: "Wallet created",
				message: "Wallet created " + doc.name,
				code: "wallet-create",
				data: doc,
			}).save();
		} else {
			var d = diff(original.toObject(), doc.toObject());
			if (d) {
				new Log({
					id: doc._id,
					model: "wallet",
					level: 3,
					user_id: self.sender._id,
					title: "Wallet changed",
					message: "Wallet changed " + doc.name,
					code: "wallet-change",
					data: d,
				}).save();
			}
		}
	} catch(err) {
		console.error(err);
	}
});

WalletSchema.virtual("__user").set(function (user) {
	this.sender = user;
});

module.exports = mongoose.model('Wallet', WalletSchema);
