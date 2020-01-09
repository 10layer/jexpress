var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');

var XeroAccountSchema   = new Schema({
	location_id: { type: ObjectId, ref: 'Location' },
	consumer_key: String,
	consumer_secret: String,
	client_id: String,
	client_secret: String,
	access_token: String,
	tenant_id: String,
	refresh_token: String,
	token_expires: Date,
}, {
	timestamps: true
});

XeroAccountSchema.set("_perms", {
	setup: "crud",
	api: "r",
	admin: "-"
});

module.exports = mongoose.model('XeroAccount', XeroAccountSchema);
