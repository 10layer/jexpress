const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;

const friendly = require("mongoose-friendly");

const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;
const Membership = require('./membership_model');
const XeroOrgAccount = require('./xeroorgaccount_model');
const Location = require('./location_model');
const User = require('./user_model');
const diff = require('deep-diff').diff;
const Log = require("./log_model");
const messagequeue = require("../libs/messagequeue");
const Organisation = require('./organisation_model');
const IndustrySector = require("./industrysector_model");
const Lineitem = require("./lineitem_model");
const Adhoc = require("./adhoc_model");

const OrganisationSchema   = new Schema({
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

function sortLineitems(lineitems) {
	let is_sorted = false;
	for (let lineitem of lineitems) {
		if (lineitem.order) is_sorted = true;
	}
	if (is_sorted) {
		lineitems.sort((a, b) => a.order - b.order);
		return lineitems; // This invoice has already been ordered, bail
	}
	var products = [];
	var licenses = [];
	var others = [];
	var primary = [];
	while (lineitems.length) {
		var lineitem = lineitems.pop();
		if (lineitem.type === "product") {
			products.push(lineitem);
		} else if (lineitem.description && lineitem.description.indexOf("(Primary Member)") !== -1) {
			primary.push(lineitem);
		} else if (lineitem.type == "license") {
			licenses.push(lineitem);
		} else {
			others.push(lineitem);
		}
	}
	products.sort((a, b) => (b.price < a.price) ? -1 : 1);
	licenses.sort((a, b) => (b.description > a.description) ? -1 : 1);
	others.sort((a, b) => (b.description > a.description) ? -1 : 1);
	return [].concat(products, others, primary, licenses);
}

const process_lineitem = lineitem => {
	lineitem = lineitem._doc;
	if (lineitem.product_id) {
		lineitem.description = `${lineitem.product_id.name}${(lineitem.comment) ? `\n${lineitem.comment}` : ``}`;
	}
	lineitem.account_code = lineitem.account_code || "2000";
	if (lineitem.product_id && lineitem.product_id.xero_account) lineitem.account_code = lineitem.product_id.xero_account;
	if (lineitem.license_id && lineitem.license_id.membership_id && lineitem.license_id.membership_id.xero_account) lineitem.account_code = lineitem.license_id.membership_id.xero_account;
	lineitem.type = "other";
	lineitem.pro_rata = false;
	if (lineitem.license_id) {
		lineitem.type = "license";
		lineitem.pro_rata = true;
	} else if (lineitem.product_id) {
		lineitem.type = "product";
		lineitem.pro_rata = lineitem.product_id.pro_rata;
	}
	lineitem.xero_tax_type = (lineitem.product_id) ? lineitem.product_id.xero_tax_type : null;
	lineitem.item_code = (lineitem.product_id) ? lineitem.product_id.xero_code : lineitem.xero_id;
	return lineitem;
}

OrganisationSchema.statics.getFull = async function(opts) {
	if (!opts.__user) {
		return Promise.reject("User required");
	}
	const _id = opts.organisation_id;
	// console.log(opts);
	const Organisation = mongoose.model('Organisation', OrganisationSchema);
	const organisation = await Organisation.findById(_id).populate("user_id").populate("location_id");
	if (!opts.__user || !opts.__user.admin) {
		if (organisation.user_id._id + "" !== opts.__user._id + "") {
			return Promise.reject("Admins and owners only");
		}
	}
	let membership = null;
	if (organisation.user_id && organisation.user_id.membership_id) {
		membership = await Membership.findById(organisation.user_id.membership_id);
	}
	// console.log({ organisation_id: _id, _deleted: false });
	const lineitems = sortLineitems((await Lineitem.find({ organisation_id: _id, _deleted: false })
		.populate({ path: "license_id", populate: { path: "membership_id" } }).populate("product_id")).map(process_lineitem));
	const adhoc_lineitems = sortLineitems((await Adhoc.find({ organisation_id: _id, _deleted: false })
		.populate({ path: "license_id", populate: { path: "membership_id" } }).populate("product_id")).map(process_lineitem));
	return { ...organisation._doc, membership, lineitems, adhoc_lineitems };
}

module.exports = mongoose.model('Organisation', OrganisationSchema);
