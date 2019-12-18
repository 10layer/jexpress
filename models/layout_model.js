var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var LayoutSchema   = new Schema({
	name: String,
	img: String,
	_version: { type: Number, default: 0 },
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

LayoutSchema.set("_perms", {
	manager: "crud",
	admin: "r",
	user: "r",
	all: "r"
});

LayoutSchema.index( { "$**": "text" } );

module.exports = mongoose.model('Layout', LayoutSchema);
