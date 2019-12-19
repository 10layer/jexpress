"use strict";

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var friendly = require("mongoose-friendly");

var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;
var Organisation = require("./organisation_model");
var Location = require("./location_model");
var Membership = require("./membership_model");
var Tag = require("./tag_model");
var diff = require('deep-diff').diff;
var Log = require("./log_model");
var Claytag = require("./claytag_model");
var messagequeue = require("../libs/messagequeue");
var Clayaccessgroup = require("./clayaccessgroup_model");

var UserSchema   = new Schema({
	name: { type: String, required: true, index: true },
	urlid: { type: String, index: { unique: true, partialFilterExpression: { urlid: { $type: 'string' } } } },
	organisation_id: { type: ObjectId, ref: "Organisation", index: true },
	location_id: { type: ObjectId, ref: "Location", index: true },
	membership_id: { type: ObjectId, ref: "Membership" }, // DEPRECATED
	email: { type: String, unique: true, index: true, set: toLower },
	emails: [String],
	id_number: String,
	password: String,
	admin: Boolean,
	temp_hash: String,
	position: String,
	twitter: { type: Mixed },
	facebook: { type: Mixed },
	google: { type: Mixed },
	linkedin: { type: Mixed },
	slack_name: String,
	skype: String,
	mobile: String,
	about: String,
	url: String,
	timezone: String,
	img: { type: String, default: '/avatars/grey_avatar_1.png' },
	start_date: { type: Date, default: Date.now },
	referee: String,
	referal_method: String,
	status: { type: String, validate: /active|inactive/, index: true, default: "inactive" },
	hidden: { type: Boolean, default: false, index: true },
	presence: { type: Boolean, default: true, index: true },
	newsletter: Boolean,
	radius_id: Number,
	pin: String,
	card: String,
	papercut_username: String,
	first_login: { type: Boolean, default: true },
	date_created: { type: Date, default: Date.now },
	tags: [ { type: ObjectId, ref: "Tag" } ],
	clay_id: String,
	claytag_id: { type: ObjectId, ref: "Claytag" },
	clay_access_group_ids: [ { type: ObjectId, ref: "Clayaccessgroup" } ],
	last_login: Date,
	xero_id: String,
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
	_import_ref: String,
}, {
	timestamps: true
});

UserSchema.set("_perms", {
	line_manager: "crud",
	manager: "cru",
	admin: "r",
	owner: "ru",
	user: "r",
	member: "r",
	api: "r"
});

UserSchema.index( { "name": "text", "email": "text" } );

/*
 * Ensure emails are unique
 */
UserSchema.pre("validate", function(next) {
	var self = this;
	this._owner_id = this._id; // Ensure the owner is always the user for this model
	this.emails = this.emails.filter(function(email) {
		if (!email.trim)
			return false;
		if (email.trim() === "")
			return false;
		return true;
	});
	for(var x = 0; x < this.emails.length; x++) {
		if (this.emails[x].trim && (this.emails[x].trim() === "")) {
			delete(this.emails[x]);
		}
	}
	var emails = this.emails;
	if (emails.length) {
		emails.forEach(function(email) {
			UserModel.findOne({ email: email }, function(err, doc) {
				if (err) {
					return next(err);
				}
				if (doc) {
					if (doc._id.toString() !== self._id.toString()) {
						console.error("Err", "Alternative email already in use in primary mails", email, doc._id, self._id);
						self.invalidate("emails", "Alternative email already in use");
						return next(new Error('Alternative email already in use'));
						// return;
					}
				}

				UserModel.findOne({ emails: email }, function(err, doc) {
					if (err) {
						return next(err);
					}
					if (doc) {
						if (doc._id.toString() !== self._id.toString()) {
							console.error("Err", "Alternative email already in use in alternative mails", email, doc._id, self._id);
							self.invalidate("emails", "Alternative email already");
							return next(new Error('Alternative email already in use'));
							// return;
						}
					}
					return next();
				});
			});
		});
	} else {
		return next();
	}
});

/*
 * Log changes
 */
UserSchema.post('validate', function(doc) {
	var self = this;
	var log = null;
	UserModel.findOne({ _id: doc._id }, function(err, original) {
		if (!original) {
			log = new Log({
				id: doc._id,
				model: "user",
				level: 3,
				user_id: self.__user,
				title: "User created",
				message: "User created " + doc.email,
				code: "user-create",
				data: doc,
			}).save();
		} else {
			var d = diff(original.toObject(), doc.toObject());
			if (d) {
				log = new Log({
					id: doc._id,
					model: "user",
					level: 3,
					user_id: self.__user,
					title: "User changed",
					message: "User changed " + doc.email,
					code: "user-change",
					data: d,
				}).save();
			}
		}
	});
});

var onboard = function(id, owner) {
	console.log(`Onboarding ${id}`);
	messagequeue.action("user", "onboard", owner, id);
};

var offboard = function(id, owner) {
	console.log(`Offboarding ${id}`);
	messagequeue.action("user", "offboard", owner, id);
};
/*
 * Onboard, offboard, suspend or unsuspend a user
 */
UserSchema.post('validate', function(doc) {
	var self = this;
	doc._isNew = false;
	UserModel.findOne({ _id: doc._id }, function(err, original) {
		if (!original) {
			if (doc.status === "active") {
				//New, active
				doc._isNew = true;
				onboard(doc._id, self.__user);
			}
		} else {
			if (doc.status !== original.status) {
				//Status has changed
				if (doc.status === "active") {
					//Status changed to active
					onboard(doc._id, self.__user);
				} else {
					//Status changed to inactive
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

UserSchema.post("save", function() {
	if (!this.email) return;
	var Contact = require("./contact_model");
	Contact.populate({ email: this.email });
});

UserSchema.path('name').validate(function (v) {
	return (v) && (v.length > 0);
}, 'Name cannot be empty');

UserSchema.plugin(friendly, {
	source: 'name',
	friendly: 'urlid'
});

function toLower (v) {
	return v.trim().toLowerCase();
}

var UserModel = mongoose.model('User', UserSchema);
module.exports = mongoose.model('User', UserSchema);
