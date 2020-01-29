var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

// var monguurl = require("monguurl");
var friendly = require("mongoose-friendly");

var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;
var Membership = require('./membership_model');
var XeroOrgAccount = require('./xeroorgaccount_model');
var Location = require('./location_model');
var User = require('./user_model');
var diff = require('deep-diff').diff;
var Log = require("./log_model");
var messagequeue = require("../libs/messagequeue");
var Organisation = require('./organisation_model');
var IndustrySector = require("./industrysector_model");

var OrganisationSchema   = new Schema({
	name: { type: String, unique: true, index: true },
	legal_name: String,
	urlid: { type: String, unique: true, index: true },
	short_name: { type: String, index: { unique: true, partialFilterExpression: { short_name: { $type: 'string' }, _deleted: false } }, set: shortname },
	tel: String,
	mobile: String,
	email: { type: String, index: true, set: toLower },
	accounts_email: { type: String, set: toLower },
	website: String,
	address: String,
	postal_address: String,
	twitter: String,
	facebook: String,
	linkedin: String,
	img: String,
	about: String,
	user_id: { type: ObjectId, ref: 'User' },
	xero_id: String,
	vat: String,
	company_registration_number: String,
	location_id: { type: ObjectId, ref: 'Location' },
	membership: { type: ObjectId, ref: 'Membership' },
	industrysector_id: [{ type: ObjectId, ref: 'IndustrySector' }],
	space_credits_per_month_override: Number,
	stuff_credits_per_month_override: Number,
	bandwidth_per_month_override: Number,
	print_credits_per_month_override: Number,
	cost_per_month_override: Number,
	items: mongoose.Schema.Types.Mixed,
	status: { type: String, validate: /active|inactive|prospect|pending|offboarded/, index: true, default: "active" },
	type: [{ type: String, validate: /member|events/, index: true, default: "member" }],
	hidden: { type: Boolean, default: false, index: true },
	product: String,
	year_founded: Number,
	employee_count: Number,
	discount: Number,
	discount_expires: Date,
	pin: String,
	papercut_username: String,
	printing: { type: Boolean, default: true },
	start_date: { type: Date, default: Date.now },
	date_created: { type: Date, default: Date.now },
	allowed_payments: [ String ],
	parent_organisation_id: { type: ObjectId, ref: 'Organisation' },
	stuff_total: Number,
	space_total: Number,
	primary_token: ObjectId,
	xeroorgaccount_id: { type: ObjectId, ref: 'XeroOrgAccount' },
	escalation_date: Date,
	subscription_locked: { type: Boolean, default: false },
	summarise_invoice: { type: Boolean, default: false },
	date_onboarded: Date,
	date_offboarded: Date,
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
	_import_ref: String,
}, {
	timestamps: true
});

OrganisationSchema.set("_perms", {
	admin: "crud",
	primary_member: "cru",
	owner: "cru",
	all: "cr"
});

OrganisationSchema.index( { "name": "text" } );

OrganisationSchema.path('name').validate(function (v) {
	return v.length > 0;
}, 'Name cannot be empty');

function toLower (v) {
	return v.toLowerCase();
}

function shortname(s) {
	return (s) ? s.toLowerCase().replace(/[^a-z0-9\-]+/g, "") : null;
}

var onboard = function(id, owner) {
	messagequeue.action("organisation", "onboard", owner, id);
};

var offboard = function(id, owner) {
	messagequeue.action("organisation", "offboard", owner, id);
};

var getOrganisation = params => {
	return new Promise((resolve, reject) => {
		mongoose.model('Organisation', OrganisationSchema).findOne(params, (err, result) => {
			if (err)
				return reject(err);
			resolve(result);
		});
	});
};

OrganisationSchema.plugin(friendly, {
	source: 'name',
	friendly: 'urlid'
});

/*
 * Only administrators or the owner of an organisation are allowed to update that organisation
 */
OrganisationSchema.pre("save", async function() {
	if (this.isNew) return;
	if (this.sender.admin) return;
	if (this.user_id + "" === this.sender._id + "") return;
	throw("Only owners can update an organisation");
});

/*
 * Log changes
 */
OrganisationSchema.post('validate', function(doc) {
	var self = this;
	var log = null;
	getOrganisation({ _id: doc._id })
	.then(original => {
		if (!original) {
			log = new Log({
				id: doc._id,
				model: "organisation",
				level: 3,
				user_id: self.sender._id,
				title: "Organisation created",
				message: "Organisation created " + doc.name,
				code: "organisation-create",
				data: doc,
			}).save();
		} else {
			var d = diff(original.toObject(), doc.toObject());
			if (d) {
				log = new Log({
					id: doc._id,
					model: "organisation",
					level: 3,
					user_id: self.sender._id,
					title: "Organisation changed",
					message: "Organisation changed " + doc.name,
					code: "organisation-change",
					data: d,
				}).save();
			}
		}
	});
});

/*
 * Onboard, offboard, suspend or unsuspend a user
 */
OrganisationSchema.post('validate', function(doc) {
	const inactiveStates = ["inactive", "prospect", "pending", "offboarded"];
	const activeStates = ["active", "hidden"];
	const self = this;
	doc._isNew = false;
	getOrganisation({ _id: doc._id })
	.then(original => {
		console.log({ original, doc, self });
		doc.active = (activeStates.indexOf(doc.status) !== -1);
		if (!original) {
			if (doc.status === "active") {
				//New, active
				doc._isNew = true;
			}
		} else {
			if (doc.status !== original.status) {
				//Status has changed
				if (doc.status === "active") {
					//Status changed to active
					onboard(doc._id, self.__user);
				} else if (doc.status === "offboarded") {
					//Status changed to offboarded
					console.log("Offboard");
					offboard(doc._id, self.__user);
				}
			}
			if (doc._deleted && !original._deleted) {
				//Doc has been deleted
				offboard(doc._id, self.__user);
			} else if (!doc._deleted && original._deleted) {
				//Doc has been undeleted
				onboard(doc._id, self.__user);
			}
		}
	});
});

OrganisationSchema.post('save', function(doc) {
	var self = this;
	if (doc._isNew)
		onboard(doc._id, self.__user);
});

OrganisationSchema.virtual("__user").set(function (user) {
	this.sender = user;
});

module.exports = mongoose.model('Organisation', OrganisationSchema);
