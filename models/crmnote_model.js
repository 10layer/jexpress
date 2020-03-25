var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var User = require("./user_model");
var Tag = require("./tag_model");

var CrmnoteSchema   = new Schema({
	organisation_id: { type: ObjectId, index: true },
	lead_id: { type: ObjectId, index: true },
	id: { type: ObjectId, index: true },
	note: {
		type: String,
		validate: {
			validator: function(v) {
			  return /^[^-\s][a-zA-Z0-9 !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{20,}$/.test(v);
			},
			message: props => `${props.value} does not begin with a character or is less than 20 characters"`
		},
	},
	date_created: { index: true, type: Date, default: Date.now },
	tag_id: [ { type: ObjectId, ref: "Tag" }],
	// ([\s\S]*)
	_owner_id: { type: ObjectId, ref: "User" }
}, {
	timestamps: true
});

CrmnoteSchema.set("_perms", {
	admin: "cru",
});

module.exports = mongoose.model('Crmnote', CrmnoteSchema);
