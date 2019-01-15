var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');
var Organisation = require("./organisation_model");
var User = require("./user_model");
var Lineitem = require("./lineitem_model");
var messagequeue = require("../libs/messagequeue");

var InvoiceSchema   = new Schema({
	xero_invoice_id: { type: String, index: true },
	invoice_id: String, // Deprecated
	xero_invoice_number: String,
	invoice_number: String, // Deprecated
	reference: String,
	organisation_id: { type: ObjectId, index: true, ref: "Organisation" },
	user_id: { type: ObjectId, index: true, ref: "User" },
	location: { type: ObjectId, index: true, ref: "Location" },
	date: Date,
	due_date: Date,
	sent: Boolean,
	status: String,
	sub_total: Number,
	total: Number,
	discount: Number,
	tax: Number,
	date_created: { type: Date, default: Date.now },
	line_items: [ mongoose.Schema.Types.Mixed ],
	original_lineitems: [ mongoose.Schema.Types.Mixed ],
	amount_due: Number,
	amount_paid: Number,
	date_paid: Date,
	paypal_id: { type: String, index: true },
	method_paid: String,
	payment_result: mongoose.Schema.Types.Mixed,
	rejection_date: Date,
	rejection_reason: String,
	xero_updated_date_utc: String,
	mail_date: Date,
	mail_result: mongoose.Schema.Types.Mixed,
	personal_account: { type: Boolean, default: false },
	_owner_id: ObjectId,
	_deleted: Boolean,
});

InvoiceSchema.set("_perms", {
	admin: "crud",
	owner: "cru",
	primary_member: "r",
	user: "c"
});

InvoiceSchema.index( { "xero_invoice_number": "text" } );

InvoiceSchema.post('validate', function(doc) {
	var self = this;
	doc._isNew = false;
	InvoiceModel.findOne({ _id: doc._id }, function(err, original) {
		if (!original) {
			if (doc.status === "AUTHORISED") {
				messagequeue.action("purchase", "invoice", owner, doc._id);
			}
		} else {
			console.log("Status", doc.status, original.status, (doc.status === "AUTHORISED") && (original.status === "DRAFT"));
			if ((doc.status === "AUTHORISED") && (original.status === "DRAFT")) {
				messagequeue.action("purchase", "invoice", owner, doc._id);
			}
		}
	});
});

InvoiceSchema.pre('save', function(next) {
	var self = this;
	if (self.status === "DELETED") self._deleted = true;
	next();
});

var InvoiceModel = mongoose.model('Invoice', InvoiceSchema);

module.exports = mongoose.model('Invoice', InvoiceSchema);
