var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;
var friendly = require("mongoose-friendly");

var PartnerSchema   = new Schema({
	name: { type: String, required: true },
	urlid: { type: String, unique: true, index: true },
	partner_id: { type: String, unique: true },
	date_created: { type: Date, default: Date.now },
	_version: { type: Number, default: 0 },
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

PartnerSchema.set("_perms", {
	setup: "crud",
	manager: "r",
	admin: "r",
	all: "r"
});

PartnerSchema.index( { "$**": "text" } );

PartnerSchema.plugin(friendly, {
	source: 'name',
	friendly: 'urlid'
});

module.exports = mongoose.model('Partner', PartnerSchema);
