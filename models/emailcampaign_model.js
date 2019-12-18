var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var EmailcampaignSchema = new Schema({
	name: String,
	to: String,
	from: String,
	theme: String,
	subject: String,
	body: String,
	date_created: { type: Date, default: Date.now },
}, {
	timestamps: true
});

EmailcampaignSchema.set("_perms", {
	manager: "crud",
	admin: "r"
});

module.exports = mongoose.model('Emailcampaign', EmailcampaignSchema);
