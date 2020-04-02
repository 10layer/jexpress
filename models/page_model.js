var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var friendly = require("mongoose-friendly");
var ObjectId = mongoose.Schema.Types.ObjectId;

var PageSchema = new Schema({
    headline: { type: String, required: true, index: true },
    urlid: { type: String, unique: true, index: true },
    date_created: { type: Date, default: Date.now },
    content: String,
    public: Boolean,
    _owner_id: ObjectId,
    _version: { type: Number, default: 0 },
    _deleted: { type: Boolean, default: false, index: true },
}, {
    timestamps: true
});

PageSchema.set("_perms", {
    setup: "crud",
    admin: "r",
    all: "r"
});

PageSchema.plugin(friendly, {
    source: 'headline',
    friendly: 'urlid'
});

module.exports = mongoose.model('Page', PageSchema);
