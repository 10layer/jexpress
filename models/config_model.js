var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var ConfigSchema   = new Schema({
	_id: String,
	value: String,
}, {
	timestamps: true
});

ConfigSchema.set("_perms", {
	setup: "crud",
	all: "r",
});

module.exports = mongoose.model('Config', ConfigSchema);
