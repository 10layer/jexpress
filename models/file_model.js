var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var friendly = require("mongoose-friendly");
var ObjectId = mongoose.Schema.Types.ObjectId;

var FileSchema = new Schema({
    original_filename: { type: String, required: true, index: true },
    local_filename: String,
    content_type: String,
    force_download: { type: Boolean, default: false },
    urlid: { type: String, unique: true, index: true },
    date_created: { type: Date, default: Date.now },
    preview_filename: String,
    public: { type: Boolean, default: false },
    _owner_id: ObjectId,
    _version: { type: Number, default: 0 },
    _deleted: { type: Boolean, default: false, index: true },
}, {
    timestamps: true
});

FileSchema.set("_perms", {
    setup: "crud",
    admin: "r",
    all: "r"
});

FileSchema.plugin(friendly, {
    source: 'original_filename',
    friendly: 'urlid'
});

module.exports = mongoose.model('File', FileSchema);
