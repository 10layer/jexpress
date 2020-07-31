var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Invoice = require('./invoice_model');

var MpesaTransactionSchema = new Schema({
    invoice_id: { type: ObjectId, ref: "Invoice", index: true },
    MerchantRequestID: String,
    CheckoutRequestID: { type: String, index: true },
    ResponseCode: String,
    ResponseDescription: String,
    CustomerMessage: String,
    ResultCode: Number,
    ResultDesc: String,
}, {
    timestamps: true
});

MpesaTransactionSchema.set("_perms", {
    super_user: "crud",
    api: "r",
    admin: "r",
});

module.exports = mongoose.model('MpesaTransaction', MpesaTransactionSchema);
