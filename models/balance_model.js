const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;
const ObjectId     = mongoose.Schema.Types.ObjectId;
const User 	     = require("./user_model");
const Ledger 	     = require("./ledger_model");
const Wallet 	     = require("./wallet_model");
const Currency 	 = require("./currency_model");
const postFind 	 = require('mongoose-post-find-findone');

const BalanceSchema   = new Schema({
	user_id: { type: ObjectId, index: true, ref: "User", required: true },
	cred_type: { type: String, index: true, required: true },
	balance: Number,
	last_update: Date,
	ledger_id: { type: ObjectId, index: true, ref: "Ledger" },
	_owner_id: ObjectId,
}, {
	strict: true,
	timestamps: true
});

BalanceSchema.set("_perms", {
	admin: "crud",
	owner: "cr",
	user: "r",
	all: ""
});

BalanceSchema.pre("save", function(next) {
	this._owner_id = this.user_id; // Ensure the owner is always the user for this model
	next();
});

BalanceSchema.plugin(postFind, { 
	// We could probably rewrite this with the new Mongoose async post middleware
	find: function(rows, done) {
		var currencies = {};
		var wallets = null;
		Currency.find()
		.then(result => {
			result.forEach(currency => {
				currencies[currency.name.toLowerCase()] = currency._id;
			});
			return Wallet.find();
		})
		.then(result => {
			wallets = result.filter(wallet => (wallet.balance));
			rows.forEach(row => {
				row._doc.balance = 0;
				if (!currencies[row.cred_type])
					return;
				var filtered_wallets = wallets.filter(wallet => ((wallet.user_id.toString() == row.user_id.toString()) && (wallet.currency_id.toString() == currencies[row.cred_type])));
				row._doc.balance = filtered_wallets.reduce((sum, b) => ( sum + b.balance ), 0);
			});
			done(null, rows);
		})
		.catch(err => {
			console.error(err);
			done(err);
		});
	},

	findOne: function(row, done) {
		if (!row.cred_type) {
			done(null, row);
		}
		Currency.findOne({ name: row.cred_type[0].toUpperCase() + row.cred_type.slice(1) })
		.then(currency => {
			return Wallet.find({ user_id: row.user_id, currency_id: currency._id });
		})
		.then(wallets => {
			row._doc.balance = wallets.reduce((sum, b) => ( sum + b.balance ), 0);
			done(null, row);
		})
		.catch(err => {
			console.error(err);
			done(err);
		});
	}
});

BalanceSchema.statics.update_balance = async function(user_id, currency_id) {
	console.log("Updating balance", user_id, currency_id);
	try {
		const currency = await Currency.findOne({ _id: currency_id });
		const cred_type = currency.name.toLowerCase();
		const wallets = await Wallet.find({ user_id: user_id, currency_id: currency._id });
		const new_balance = wallets.reduce((sum, b) => ( sum + b.balance ), 0);
		const balance = await Balance.find({ user_id, cred_type });
		return await balance[0].updateOne({ balance: new_balance });
	} catch(err) {
		console.error(err);
		return "An error occured updating balance";
	}
};

BalanceSchema.statics.get_user_balances = function(opts) {
	console.log("Balance get_user_balances");
	return new Promise((resolve, reject) => {
		var q = {
			user: {
				$exists: true
			},
			"user.status": "active",
			"user._deleted": { $ne: true }
		}
		if (opts.search) {
			q["$or"] = [
				{"user.email": { $regex: opts.search, $options: "i" }},
				{"user.name": { $regex: opts.search, $options: "i" }},
			]
		}
		if (opts.cred_type) {
			q["cred_type"] = opts.cred_type;
		}
		var aggregate = [
			{
				$group: {
					_id: { user_id: "$user_id", currency_id: "$currency_id" },
					total: { $sum: "$balance" }
				}
			},
			// {
			// 	$match: {
			// 		total: { $gt: 0 }
			// 	}
			// },
			{
				$lookup: {
					from: "users",
					localField: "_id.user_id",
					foreignField: "_id",
					as: "user",
				}
			},
			{
				$unwind: "$user",
			},
			{
				$lookup: {
					from: "currencies",
					localField: "_id.currency_id",
					foreignField: "_id",
					as: "currency",
				}
			},
			{
				$unwind: "$currency",
			},
			{
				$project: {
					cred_type: { $toLower: "$currency.name" },
					"balance": "$total",
					"user": 1
				}
			},
			{
				$match: q
			},
			{
				$sort: { "user.name": 1 }
			},
			{
				$project: {
					cred_type: 1,
					"user.name": 1,
					"user.email": 1,
					"user.img": 1,
					"user._id": 1,
					"balance": 1,
					_id: 0,
				}
			}
		]
		Wallet.aggregate(aggregate).exec(function(err, result) {
			if (err) {
				console.error(err)
				return reject(err);
			}
			return resolve(result);
		})
	})
}

const Balance = mongoose.model('Balance', BalanceSchema)
module.exports = Balance;
