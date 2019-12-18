var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Organisation = require("./organisation_model");
var Membership = require("./membership_model");
var User = require("./user_model");
var Invoice = require("./invoice_model");
var Space = require("./space_model");
var Location = require("./location_model");
var Claytag = require("./claytag_model");
var LineItem = require("./lineitem_model");
var diff = require('deep-diff').diff;
var Log = require("./log_model");

var LicenseSchema   = new Schema({
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
	managers: "crud",
	admin: "r",
	primary_member: "r",
	user: "r"
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

module.exports = mongoose.model('License', LicenseSchema);
