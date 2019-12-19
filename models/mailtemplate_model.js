var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;
var friendly = require("mongoose-friendly");

var MailtemplateSchema   = new Schema({
	name: String,
	urlid: { type: String, unique: true, index: true },
	subject: String,
	body: String,
	_version: { type: Number, default: 0 },
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

MailtemplateSchema.set("_perms", {
	setup: "crud",
	super_user: "crud",
	manager: "r",
	admin: "r",
	all: "r"
});

MailtemplateSchema.index( { "$**": "text" } );

MailtemplateSchema.plugin(friendly, {
	source: 'name',
	friendly: 'urlid'
});

module.exports = mongoose.model('Mailtemplate', MailtemplateSchema);
