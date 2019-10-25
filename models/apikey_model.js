const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;

const ObjectId = mongoose.Schema.Types.ObjectId;

const APIKeySchema   = new Schema({
	user_id: { type: ObjectId, index: true },
	apikey: { type: String, index: true, unique: true },
	created: { type: Date, default: Date.now, index: true },
	primary: { type: Boolean, index: true },
	last_accessed: { type: Date, default: Date.now, index: true },
}, {
	timestamps: true
});

APIKeySchema.set("_perms", {
	//We can never change or view this directly
});

module.exports = mongoose.model('APIKey', APIKeySchema);
