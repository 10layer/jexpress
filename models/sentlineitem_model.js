const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;

const ObjectId = mongoose.Schema.Types.ObjectId;
const Organisation = require("./organisation_model");
const LineItem = require("./lineitem_model");
const Location = require("./location_model");
const User = require("./user_model");
const Product = require("./product_model");
const Invoice = require("./invoice_model");
const Booking = require("./booking_model");
const License = require("./license_model");

const SentlineitemSchema = new Schema({
	description: String,
	organisation_id: { type: ObjectId, ref: "Organisation", index: true },
	lineitem_id: { type: ObjectId, ref: "LineItem" },
	location_id: { type: ObjectId, ref: "Location", index: true },
	user_id: { type: ObjectId, ref: "User" },
	product_id: { type: ObjectId, ref: "Product" },
	invoice_id: { type: ObjectId, ref: "Invoice", required: true, index: true },
	booking_id: { type: ObjectId, ref: "Booking" },
	license_id: { type: ObjectId, ref: "License" },
	amount: {
		type: Number,
		validate: function(v) {
			return v > 0;
		},
		required: true
	},
	price: {
		type: Number,
		validate: function(v) {
			return v >= 0;
		},
		required: true
	},
	tax_type: String,
	comment: String,
	discount: { type: Number, default: 0 },
	date_created: { type: Date, default: Date.now },
	is_quote: Boolean,
	xero_account: String,
	xero_id: String,
	date_start: Date,
	date_end: Date,
	type: String,
	order: Number,
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true }
}, {
	toObject: {
		virtuals: true
	},
	toJSON: {
		virtuals: true
	},
	timestamps: true
});

SentlineitemSchema.set("_perms", {
	admin: "crud",
	owner: "cr",
	primary_member: "r",
	user: "r",
	all: ""
});

SentlineitemSchema.virtual('calculated_discount').get(function() { return this.discount; });


module.exports = mongoose.model('Sentlineitem', SentlineitemSchema);
