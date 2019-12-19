var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var GuestSchema   = new Schema({
	name: { type: String, index: true },
	organisation: String,
	location_id: Objectid,
	email: { type: String, index: true },
	mobile: String,
	invited_by: [ Objectid ],
	created_date: { type: Date, default: Date.now },
	visiting_date: Date,
	source: String,
	login_method: String,
	mac: [ mongoose.Schema.Types.Mixed ],
	ip: [ mongoose.Schema.Types.Mixed ]
}, {
	timestamps: true
});

GuestSchema.set("_perms", {
	manager: "crud",
	admin: "cr",
	user: "cr",
});

GuestSchema.index( { "$**": "text" } );

GuestSchema.post("save", function() {
	if (!this.email) return;
	var Contact = require("./contact_model");
	Contact.populate({ email: this.email });
})

module.exports = mongoose.model('Guest', GuestSchema);
