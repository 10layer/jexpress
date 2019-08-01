var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;

var GatewaySchema = new Schema({
    name: String,
    url: String,
    lib: String,
    _owner_id: ObjectId,
    _deleted: { type: Boolean, default: false, index: true },
}, {
    timestamps: true
});

GatewaySchema.set("_perms", {
    admin: "crud",
});


module.exports = mongoose.model('Gateway', GatewaySchema);
