const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;

const ObjectId = mongoose.Schema.Types.ObjectId;
const Organisation = require("./organisation_model");
const Membership = require("./membership_model");
const Discount = require("./discount_model");
const User = require("./user_model");
const Invoice = require("./invoice_model");
const Space = require("./space_model");
const Location = require("./location_model");
const Claytag = require("./claytag_model");
const LineItem = require("./lineitem_model");
const diff = require('deep-diff').diff;
const Log = require("./log_model");

const LicenseSchema   = new Schema({
	organisation_id: { type: ObjectId, ref: 'Organisation', index: true, required: true },
	membership_id: { type: ObjectId, ref: 'Membership', required: true },
	xero_account: String,
	user_id: { type: ObjectId, ref: 'User', index: true },
	claytag_id: { type: ObjectId, ref: "Claytag" },
	date_created: { type: Date, default: Date.now },
	invoice_id: { type: ObjectId, ref: 'Invoice', index: true },
	space_id: { type: ObjectId, ref: 'Space', index: true },
	location_id: { type: ObjectId, ref: 'Location', index: true },
	lineitem_id: { type: ObjectId, ref: 'LineItem', index: true },
	date_start: Date,
	date_end: Date,
	price: {
		type: Number,
		validate: function(v) {
			return v >= 0;
		},
	},
	discount: { type: Number, default: 0 },
	discount_date_start: Date,
	discount_date_end: Date,
	discount_description: String,
	discount_comment: String,
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	toObject: {
		virtuals: true
	},
	toJSON: {
		virtuals: true
	},
	timestamps: true
});

LicenseSchema.set("_perms", {
	finance: "crud",
	line_manager: "crud",
	"managers": "cr",
	admin: "r",
	primary_member: "r",
	user: "r"
});

const applyDiscount = (discount, row) => {
	discount = discount || {};
	row._doc.discount_date_start = discount.date_start || null;
	row._doc.discount_date_end = discount.date_end || null;
	row._doc.discount = discount.discount || 0;
	row._doc.discount_comment = discount.comment || "";
	return row;
}

LicenseSchema.post("findOne", async function (row) {
	const discount = await Discount.findOne({ _deleted: false, license_id: row._id });
	applyDiscount(discount, row);
});

LicenseSchema.post("find", async function(rows, next) {
	const discounts = await Discount.find({ _deleted: false, license_id: { $exists: true } });
	for (let row of rows) {
		const discount = discounts.find(discount => discount.license_id + "" === row._id + "");
		applyDiscount(discount, row);
	}
	next();
});

LicenseSchema.pre("save", async function() {
	const membership = await Membership.findOne({ _id: this.membership_id });
	if (!membership) throw("Could not find membership");
	if (membership.location_id + "" !== this.location_id + "") throw("Membership and license location don't match");
});

// Discounts
LicenseSchema.pre("save", async function () {
	const User = require("./user_model");
	let discount = await Discount.findOne({ license_id: this._id, _deleted: false }).exec();
	if ((!this.discount) && (discount)) {
		// Delete existing discount and bail
		discount._deleted = true;
		discount.save();
		return;
	}
	if (!this.discount) return; // No discount to set
	if (discount) {
		// Update existing discount
		let description = "LICENSE - No User";
		if (this.user_id) {
			const user = await User.findOne({ _id: this.user_id });
			description = `LICENSE - ${user.name} (${user.email})`;
		}
		discount.discount = this.discount;
		discount.date_start = this.discount_date_start;
		discount.date_end = this.discount_date_end;
		discount.description = description;
		if (this.discount_comment)
			discount.comment = this.discount_comment;
	} else {
		// Create a new discount
		let description = "LICENSE - No User";
		if (this.user_id) {
			const user = await User.findOne({ _id: this.user_id });
			description = `LICENSE - ${ user.name } (${ user.email })`;
		}
		discount = new Discount({
			discount: this.discount,
			license_id: this._id,
			organisation_id: this.organisation_id,
			date_start: this.discount_date_start,
			date_end: this.discount_date_end,
			comment: this.discount_comment,
			description,
			_owner_id: this.sender._id
		});
	}
	await discount.save();
});

/*
 * Log changes
 */
LicenseSchema.post('validate', function(doc) {
	var self = this;
	var log = null;
	var LicenseModel = mongoose.model('License', LicenseSchema);
	LicenseModel.findOne({ _id: doc._id }, function(err, original) {
		if (!original) {
			log = new Log({
				id: doc._id,
				model: "license",
				level: 3,
				user_id: self.__user,
				title: "License created",
				message: "License created",
				code: "license-create",
				data: doc,
			}).save();
		} else {
			var d = diff(original.toObject(), doc.toObject());
			if (d) {
				log = new Log({
					id: doc._id,
					model: "license",
					level: 3,
					user_id: self.__user,
					title: "License changed",
					message: "License changed",
					code: "license-change",
					data: d,
				}).save();
			}
		}
	});
});

LicenseSchema.virtual("status").get(function() {
	var now = new Date();
	if (!this.date_start) return "current";
	var date_start = +new Date(this.date_start);
	if (date_start > now) return "pending";
	if (!this.date_end) return "current";
	var date_end = +new Date(this.date_end);
	if (date_end && date_end < now) return "expired";
	return "current";
});

LicenseSchema.virtual("__user").set(function (user) {
	this.sender = user;
});

module.exports = mongoose.model('License', LicenseSchema);
