var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;
var Location = require('./location_model');

var XeroAccountSchema   = new Schema({
	location_id: { type: ObjectId, ref: 'Location', unique: true },
	consumer_key: String, // oAuth1
	consumer_secret: String, // oAuth1
	client_id: String, // oAuth2
	client_secret: String, // oAuth2
	access_token: String, // oAuth2
	tenant_id: String, // oAuth2
	tenant_ids: [ Mixed ],
	refresh_token: String, // oAuth2
	token_expires: Date, // oAuth2
}, {
	timestamps: true
});

XeroAccountSchema.set("_perms", {
	setup: "crud",
	api: "r",
	admin: "r"
});

module.exports = mongoose.model('XeroAccount', XeroAccountSchema);
