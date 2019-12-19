var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');

var XeroAccountSchema   = new Schema({
	location_id: { type: ObjectId, ref: 'Location' },
	consumer_key: String,
	consumer_secret: String
}, {
	timestamps: true
});

XeroAccountSchema.set("_perms", {
	super_user: "crud",
	finance: "crud",
	manager: "r",
	admin: "r",
	user: "r"
});

module.exports = mongoose.model('XeroAccount', XeroAccountSchema);
