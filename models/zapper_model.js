var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');

var ZapperSchema = new Schema({
    location_id: { type: ObjectId, ref: 'Location', index: true, unique: true },
    merchantId: Number,
    siteId: Number,
    apiKey: String,
    bankId: String,
}, {
    timestamps: true
});

ZapperSchema.set("_perms", {
    super_user: "crud",
    api: "r",
    admin: "r",
});

module.exports = mongoose.model('Zapper', ZapperSchema);
