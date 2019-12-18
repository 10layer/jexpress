var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;

var ClayAccessGroupSchema   = new Schema({
	id: { type: String, index: true },
	name: String,
	is_assigned: Boolean,
	system: mongoose.Schema.Types.Mixed,
	date_created: { type: Date, default: Date.now },
	_owner_id: ObjectId
}, {
	timestamps: true
});

ClayAccessGroupSchema.set("_perms", {
	manager: "crud",
	admin: ""
});

module.exports = mongoose.model('Clayaccessgroup', ClayAccessGroupSchema);
