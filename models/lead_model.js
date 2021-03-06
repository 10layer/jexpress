var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');
var Space = require('./space_model');
var User = require('./user_model');
var axios = require("axios");
var config = require("config");

var LeadSchema   = new Schema({
	name: { type: String, index: true },
	organisation: String,
	location_id: { type: ObjectId, index: true, ref: "Location" },
	space_id: { type: ObjectId, index: true, ref: "Space" },
	email: { type: String, index: true },
	mobile: String,
	date_created: { type: Date, default: Date.now, index: true },
	source: String,
	source_info: String,
	how_did_you_find_out_about_us: String,
	url: String,
	type: String,
	intercom_id: String,
	mailtemplate_id: ObjectId,
	membership_id: { type: ObjectId, ref: "Membership" },
	opportunity_id: [{type: ObjectId, ref: "Opportunity"}],
	short_name: String,
	legal_name: String,
	accounts_email: String,
	website: String,
	address: String,
	postal_address: String,
	vat: String,
	company_registration_number: String,
	seats: Number,
	spam: { type: Boolean, default: false },
	data: mongoose.Schema.Types.Mixed,
	"g-recaptcha-response": String,
	referral_user_id: { type: ObjectId, ref: "User" },
	referral_date_paid: Date,
	referral_amount: Number,
	heat: { type: String, validate: /hot|mild|cold/, default: "mild" },
	_deleted: { type: Boolean, default: false, index: true },
	_owner_id: ObjectId,
	archived: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

LeadSchema.set("_perms", {
	admin: "cru",
	super_user: "crud",
	user: "cr",
	all: "c",
});

LeadSchema.index( { "name": "text", "email": "text", "organisation": "text" } );

LeadSchema.pre("save", async function(next) {
	try {
		console.log("pre-save");
		if (!this.isNew) // Is an edit
			return Promise.resolve();
		if (this.__user) {
			this.spam = false;
			return Promise.resolve();
		}
		if (this.email && this.email.endsWith(".ru")) {
			this.spam = true;
			return Promise.resolve();
		}
		if (this["g-recaptcha-response"]) {
			const captcha_request = (await axios({
				method: "post",
				url: config.recaptcha.url, 
				params: { 
					secret: config.recaptcha.secret, 
					response: this["g-recaptcha-response"] 
				}
			}));
			const captcha = captcha_request.data;
			console.log({ captcha });
			this.spam = !captcha.success;
			return Promise.resolve();
		}
		this.spam = true;
		return Promise.resolve();
	} catch(err) {
		console.error({ err });
		throw(err);
	}
});

LeadSchema.pre("save", function(next) {
	if (!this.isNew) return next();
	if (!this.spam) return next();
	var err = new Error('Spam');
	next(err);
});

LeadSchema.post("save", function() {
	if (!this.email) return;
	if (this.spam) return;
	var Contact = require("./contact_model");
	Contact.populate({ email: this.email });
})

module.exports = mongoose.model('Lead', LeadSchema);
