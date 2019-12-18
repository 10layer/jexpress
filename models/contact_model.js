// This model is a meta-model for everywhere we might store a potential contact

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId    = mongoose.Schema.Types.ObjectId;
var User        = require("./user_model");
var Lead        = require("./lead_model");
var Guest       = require("./guest_model");
var Organisation = require("./organisation_model");

var ContactSchema   = new Schema({
	email: { type: String, index: true, required: true },
    name: String,
    organisation: String,
    mobile: String,
    bio: String,
    img: String,
    user_id: { type: ObjectId, ref: "User" },
    lead_id: [{ type: ObjectId, ref: "Lead" }],
    guest_id: { type: ObjectId, ref: "Guest" },
    notes: [{
		note: String,
		date_created: { type: Date, default: Date.now },
		user_id: { type: ObjectId, ref: "User" }
	}],
}, {
	timestamps: true
});

ContactSchema.set("_perms", {
    manager: "cru",
    admin: ""
});

ContactSchema.index( { "name": "text", "email": "text", "organisation": "text" } );

var updateContact = async function(data) {
    var Contact = require("./contact_model");
    data.email = data.email.trim().toLowerCase();
    if (data.name) data.name = data.name.trim();
    if (data.organisation) data.organisation = data.organisation.trim();
    var contact = await Contact.findOne({ email: data.email });
    var result = null;
    if (contact) {
        if (data.lead_id && contact.lead_id && contact.lead_id.length && contact.lead_id.indexOf(data.lead_id) === -1) {
            var leads = contact.lead_id;
            leads.push(data.lead_id);
            data.lead_id = leads;
        } else if (data.lead_id) data.lead_id = [ data.lead_id ];
        // console.log(data);
        result = await contact.update(data);
    } else {
        if (data.lead_id) data.lead_id = [ data.lead_id ];
        result = await Contact.create(data);
    }
    return result;
}

ContactSchema.statics.populate = async function(opts) {
    var params = opts || {};
    if (params.__user) {
        delete(params.__user);
    }
    console.log("Contact Populate", params);
    var contacts = [];
    var guests = await Guest.find(params);
    for(let x = 0; x < guests.length; x++) {
        if (guests[x].email) {
            var data = {
                email: guests[x].email,
                guest_id: guests[x]._id,
                name: guests[x].name,
                mobile: guests[x].mobile,
                organisation: guests[x].organisation
            }
            contacts.push(await updateContact(data));
        }
    }
    params._deleted = false;
    var leadParams = params;
    leadParams.spam = false;
    var leads = await Lead.find(leadParams);
    for(let x = 0; x < leads.length; x++) {
        if (leads[x].email) {
            var data = {
                email: leads[x].email,
                lead_id: leads[x]._id,
                name: leads[x].name,
                mobile: leads[x].mobile,
                organisation: leads[x].organisation
            }
            contacts.push(await updateContact(data));
        }
    }

    var users = await User.find(params);
    var organisations = await Organisation.find();
    for(let x = 0; x < users.length; x++) {
        var data = {
            email: users[x].email,
            user_id: users[x]._id,
            name: users[x].name,
            mobile: users[x].mobile,
            bio: users[x].about,
        }
        var organisation = organisations.filter(organisation => organisation._id + "" === users[x].organisation_id + "");
        if (organisation.length) {
            data.organisation = organisation[0].name;
        }
        contacts.push(await updateContact(data));
    }
    return [];
}

module.exports = mongoose.model('Contact', ContactSchema);
