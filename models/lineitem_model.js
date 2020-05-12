const mongoose 			= require("mongoose");
const Schema 			= mongoose.Schema;

const ObjectId 		= mongoose.Schema.Types.ObjectId;
const Organisation 	= require("./organisation_model");
const Product 		= require("./product_model");
const Invoice 		= require("./invoice_model");
const Booking 		= require("./booking_model");
const License 		= require("./license_model");
const Location 		= require("./location_model");
const User 			= require("./user_model");
const Discount 		= require("./discount_model");
const Log 			= require("./log_model");
const diff 			= require('deep-diff').diff;

const LineItemSchema = new Schema({
	description: String,
	organisation_id: { type: ObjectId, ref: "Organisation", index: true },
	location_id: { type: ObjectId, ref: "Location", index: true },
	user_id: { type: ObjectId, ref: "User" },
	product_id: { type: ObjectId, ref: "Product" },
	invoice_id: { type: ObjectId, ref: "Invoice" },
	booking_id: { type: ObjectId, ref: "Booking" },
	license_id: { type: ObjectId, ref: "License", unique: true, sparse: true },
	amount: {
		type: Number,
		validate: function(v) {
			return v > 0;
		},
		required: true
	},
	price: {
		type: Number,
		required: true
	},
	price_customised: { type: Boolean, default: false },
	price_customised_user_id: { type: ObjectId, ref: "User" },
	price_customised_reason: String,
	price_customised_date: Date,
	tax_type: String,
	comment: String,
	discount: { type: Number, default: 0 },
	discount_date_start: Date,
	discount_date_end: Date,
	discount_description: String,
	discount_comment: String,
	date_created: { type: Date, default: Date.now },
	is_quote: Boolean,
	xero_id: String,
	date_start: { type: Date, max: '9999-12-31', min: '1800-01-01', index: true },
	date_end: { type: Date, max: '9999-12-31', min: '1800-01-01', index: true },
	// order: Number,
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
	_version: { type: Number, default: 0 },
}, {
	toObject: {
		virtuals: true
	},
	toJSON: {
		virtuals: true
	},
	timestamps: true,
	writeConcern: {
		w: 'majority',
		j: true,
		wtimeout: 1000
	},
});

LineItemSchema.set("_perms", {
	finance: "crud",
	manager: "crud",
	line_manager: "crud",
	admin: "r",
	owner: "r",
	primary_member: "r",
	user: "r",
	all: ""
});

LineItemSchema.virtual("status").get(function() {
	var now = new Date();
	if (!this.date_start) return "current";
	var date_start = +new Date(this.date_start);
	if (date_start > now) return "pending";
	if (!this.date_end) return "current";
	var date_end = +new Date(this.date_end);
	if (date_end && date_end < now) return "expired";
	return "current";
});

// Ensure product ID matches location ID
LineItemSchema.pre("save", async function () {
	try {
		if (!this.product_id) return;
		let product = await Product.findOne({ _id: this.product_id });
		if (product.location_id + "" !== this.location_id + "") {
			return Promise.reject("Product location does not match lineitem location");
		}
	} catch(err) {
		return Promise.reject(err);
	}
});

// Discounts
LineItemSchema.pre("save", async function() {
	// console.log("Checking discounts");
	let discount = await Discount.findOne({ lineitem_id: this._id, _deleted: false }).exec();
	if ((!this.discount) && (discount)) {
		// Delete existing discount and bail
		// console.log("No discount found");
		discount._deleted = true;
		discount.save();
		return;
	}
	if (!this.discount) {
		// console.log("No discount set");
		return; // No discount to set
	}
	let description = this.description;
	if (this.product_id) {
		let product = await Product.findOne({ _id: this.product_id });
		description = `PRODUCT - ${ product.name }${ (this.description) ? ` - ${ this.description }` : "" }`;
	}
	if (discount) {
		// console.log("Updating discount");
		discount.discount = this.discount;
		discount.date_start = this.discount_date_start;
		discount.date_end = this.discount_date_end;
		discount.description = description;
		if (this.discount_comment) 
			discount.comment = this.discount_comment;
		console.log(discount);
	} else {
		// console.log("Creating discount");
		discount = new Discount({
			discount: this.discount,
			lineitem_id: this._id,
			license_id: this.license_id,
			organisation_id: this.organisation_id,
			date_start: this.discount_date_start,
			date_end: this.discount_date_end,
			description,
			comment: this.discount_comment,
			_owner_id: this.sender._id
		});
	}
	await discount.save();
});

const _calculate_row_discount = (row, org_discounts) => {
	var now = new Date();
	row._doc.calculated_discount = 0;
	if (!org_discounts.length) {
		return row;
	}
	var lineitem_discounts = [];
	for (let discount of org_discounts) {
		if (discount.lineitem_id && discount.lineitem_id + "" === row._id + "" && (discount.discount > 0)) {
			lineitem_discounts.push(discount);
		} else if (discount.license_id && row.license_id && discount.license_id + "" === row.license_id + "") {
			lineitem_discounts.push(discount);
		} else if (discount.apply_to.includes("all")) {
			lineitem_discounts.push(discount);
		} else if (discount.apply_to.includes("product") && row.product_id) {
			lineitem_discounts.push(discount);
		} else if (discount.apply_to.includes("license") && row.license_id) {
			lineitem_discounts.push(discount);
		} else if (discount.apply_to.includes("booking") && row.booking_id) {
			lineitem_discounts.push(discount);
		}
	}
	row._doc.discounts = lineitem_discounts.map(discount => discount._id);
	row._doc.calculated_discount = lineitem_discounts.filter(discount => (!discount.date_start || now >= discount.date_start) && (!discount.date_end || now < discount.date_end)).reduce((sum, b) => ( sum + b.discount ), 0);
	if (row._doc.calculated_discount > 100) {
		row._doc.calculated_discount = 100;
	}
	const line_discount = org_discounts.find(discount => discount.lineitem_id + "" === row._id + "");
	row._doc.discount = 0;
	row._doc.discount_date_start = null;
	row._doc.discount_date_end = null;
	if (line_discount && line_discount.discount) {
		row._doc.discount = line_discount.discount;
		row._doc.discount_date_start = line_discount.date_start;
		row._doc.discount_date_end = line_discount.date_end;
	}
	return row;
}

LineItemSchema.post("find", async (rows, next) => {
	try {
		const discounts = await Discount.find({ _deleted: false });
		for (let row of rows) {
			row._doc.calculated_discount = 0;
			const org_discounts = discounts.filter(discount => (row.organisation_id + "" === discount.organisation_id + "") || (row.organisation_id && row.organisation_id._id + "" === discount.organisation_id + ""));
			row = _calculate_row_discount(row, org_discounts);
		}
		next();
	} catch(err) {
		console.error(err);
		next(err);
	}
});

LineItemSchema.post("findOne", async (row, next) => {
	try {
		if (!row || !row.organisation_id) return next();
		const discounts = await Discount.find({ organisation_id: row.organisation_id, _deleted: false });
		row = _calculate_row_discount(row, discounts);
		next();
	} catch(err) {
		console.error(err);
		next(err);
	}
});

// Check if we've changed the value of the product or license
LineItemSchema.pre("save", function(next) {
	var lineitem = this;
	if (!lineitem.product_id && !lineitem.license_id) {
		// Nothing to see here
		return next();
	}
	var LineItem = require("./lineitem_model");
	LineItem.findOne({ _id: lineitem._id })
	.then(result => {
		if (result) {
			lineitem._is_new = false;
			if (result.price !== lineitem.price) {
				lineitem.price_customised = true;
				lineitem.price_customised_user_id = lineitem.sender._id;
				lineitem.price_customised_date = new Date();
			}
			next();
		} else {
			lineitem._is_new = false;
			if (lineitem.product_id) {
				Product.findOne({ _id: lineitem.product_id })
				.then(product => {
					if (product.price !== lineitem.price) {
						lineitem.price_customised = true;
						lineitem.price_customised_user_id = lineitem.sender._id;
						lineitem.price_customised_date = new Date();
					}
					next();
				})
				.catch(err => {
					console.error(err);
					next(err);
				});
			} else {
				License.findOne({ _id: lineitem.license_id }).populate('membership_id').populate('organisation_id')
				.then(license => {
					var price = null;
					if (license.organisation_id.user_id === license.user_id) {
						price = license.membership_id.cost;
					} else {
						price = license.membership_id.cost_extra_member;
					}
					if (price !== lineitem.price) {
						lineitem.price_customised = true;
						lineitem.price_customised_user_id = lineitem.sender._id;
						lineitem.price_customised_date = new Date();
					}
					next();
				})
				.catch(err => {
					console.error(err);
					next(err);
				});
			}
		}
	})
	.catch(err => {
		console.error(err);
		next(err);
	});
});

var getLineItem = params => {
	return new Promise((resolve, reject) => {
		mongoose.model('LineItem', LineItemSchema).findOne(params, (err, result) => {
			if (err)
				return reject(err);
			resolve(result);
		});
	});
};

/*
 * Log changes
 */
LineItemSchema.post('validate', function (doc) {
	var self = this;
	var log = null;
	getLineItem({ _id: doc._id })
	.then(original => {
		if (!original) {
			log = new Log({
				id: doc.organisation_id,
				model: "organisation",
				level: 3,
				user_id: self.sender._id,
				title: "Line Item created",
				message: "Line Item created",
				code: "lineitem-create",
				data: doc,
			}).save();
		} else {
			var d = diff(original.toObject(), doc.toObject());
			if (d) {
				log = new Log({
					id: doc.organisation_id,
					model: "organisation",
					level: 3,
					user_id: self.sender._id,
					title: "Line Item changed",
					message: "Line Item changed",
					code: "lineitem-change",
					data: d,
				}).save();
			}
		}
	});
});

LineItemSchema.statics.find_bad_product_lineitems = function(opts) {
	console.log("Find lineitems that don't match product location");
	return new Promise((resolve, reject) => {
		var aggregate = [
			{
				$match: {
					product_id: { $exists: true },
					location_id: { $exists: true },
					'_deleted': false
				}
			},
			{
				$lookup: {
					from: "products",
					localField: "product_id",
					foreignField: "_id",
					as: "product"
				}
			},
			{
				$unwind: "$product"
			},
			{
				$project: {
					_id: 1,
					organisation_id: 1,
					location_id: 1,
					product_location_id: "$product.location_id",
					comment: 1,
					product_description: "$product.description",
					sameloc: {
						$cmp: ["$location_id", "$product.location_id"]
					},
					url: {
						$concat: ["https://my.workshop17.co.za/admin/edit/organisation/", { "$toString": "$organisation_id" }]
					}
				}
			},
			{
				$match: {
					sameloc: { $ne: 0 }
				}
			},
			{
				'$lookup': {
					'from': 'locations',
					'localField': 'product_location_id',
					'foreignField': '_id',
					'as': 'product_location'
				}
			}, 
			{
				'$unwind': '$product_location'
			}, 
			{
				'$lookup': {
					'from': 'locations',
					'localField': 'location_id',
					'foreignField': '_id',
					'as': 'lineitem_location'
				}
			}, 
			{
				'$unwind': '$lineitem_location'
			},
			{
				$project: {
					_id: 0,
					lineitem_id: "$_id",
					url: 1,
					comment: 1,
					description: 1,
					product_description: 1,
					product_location: "$product_location.name",
					lineitem_location: "$lineitem_location.name",
				}
			}
		]
		LineItem.aggregate(aggregate).exec(function (err, result) {
			if (err) {
				console.error(err)
				return reject(err);
			}
			return resolve(result);
		})
	})
}

LineItemSchema.statics.find_bad_license_lineitems = function (opts) {
	console.log("Find lineitems that don't match license location");
	return new Promise((resolve, reject) => {
		var aggregate = [
			{
				'$match': {
					'license_id': {
						'$exists': true
					},
					'location_id': {
						'$exists': true
					},
					'_deleted': false
				}
			}, {
				'$lookup': {
					'from': 'licenses',
					'localField': 'license_id',
					'foreignField': '_id',
					'as': 'license'
				}
			}, {
				'$unwind': '$license'
			}, {
				'$lookup': {
					'from': 'memberships',
					'localField': 'license.membership_id',
					'foreignField': '_id',
					'as': 'membership'
				}
			}, {
				'$unwind': '$membership'
			}, {
				'$project': {
					'_id': 1,
					'organisation_id': 1,
					'location_id': 1,
					'license_location_id': '$license.location_id',
					'comment': 1,
					'license_user_id': '$license.user_id',
					'membership_location_id': '$membership.location_id',
					'membership_name': '$membership.name',
					'_deleted': 1,
					'sameloc': {
						'$cmp': [
							'$membership.location_id', '$license.location_id'
						]
					},
					'url': {
						'$concat': [
							'https://my.workshop17.co.za/admin/edit/organisation/', {
								'$toString': '$organisation_id'
							}
						]
					}
				}
			}, {
				'$match': {
					'sameloc': {
						'$ne': 0
					}
				}
			}, {
				'$lookup': {
					'from': 'users',
					'localField': 'license_user_id',
					'foreignField': '_id',
					'as': 'user'
				}
			}, {
				'$unwind': '$user'
			}, {
				'$lookup': {
					'from': 'locations',
					'localField': 'license_location_id',
					'foreignField': '_id',
					'as': 'license_location'
				}
			}, {
				'$unwind': '$license_location'
			}, {
				'$lookup': {
					'from': 'locations',
					'localField': 'membership_location_id',
					'foreignField': '_id',
					'as': 'membership_location'
				}
			}, {
				'$unwind': '$membership_location'
			}, {
				'$project': {
					'_id': 0,
					'lineitem_id': '$_id',
					'url': 1,
					'license_location_name': '$license_location.name',
					'membership_location_name': '$membership_location.name',
					'comment': 1,
					'description': 1,
					'membership_name': 1,
					'license_user_name': '$user.name',
					'license_user_email': '$user.email'
				}
			}
		];
		LineItem.aggregate(aggregate).exec(function (err, result) {
			if (err) {
				console.error(err)
				return reject(err);
			}
			return resolve(result);
		})
	})
}

LineItemSchema.virtual("__user").set(function (user) {
	this.sender = user;
});

const LineItem = mongoose.model("LineItem", LineItemSchema);
module.exports = LineItem;
