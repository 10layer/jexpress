var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var IndustrySectorSchema   = new Schema({
	name: { type: String, unique: true },
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	timestamps: true
});

IndustrySectorSchema.set("_perms", {
	admin: "crud",
	user: "cr",
	all: "cr"
});


module.exports = mongoose.model('IndustrySector', IndustrySectorSchema);
