var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Product = require("./product_model");
var Location = require("./location_model");

var ObjectId = mongoose.Schema.Types.ObjectId;

var VoucherSchema   = new Schema({
	code: { type: Number, index: true, unique: true },
	redeemed: { type: Boolean, default: false },
	product_id: { type: ObjectId, ref: "Product" },
	location_id: { type: ObjectId, ref: "Location" },
	date_created: { type: Date, default: Date.now },
	date_redeemed: Date,
	issued_by: String,
	notes: String,
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
});

VoucherSchema.pre("save", function(next) {
	var self = this;
	var checkVoucher = function(voucher) {
		return voucher.code === self.code;
	};
	var min = 100000000;
	var max = 1000000000;
	var Vouchers = mongoose.model("Voucher", VoucherSchema);
	Vouchers.find({}, function(err, vouchers) {
		var test = null;
		do {
			self.code = Math.floor(Math.random() * (max - min)) + min;
			console.log(self.code);
			test = vouchers.find(checkVoucher);
		} while(test);
		next();	
	});
});

VoucherSchema.set("_perms", {
	admin: "crud",
	owner: "r",
	user: "",
	all: ""
});


module.exports = mongoose.model('Voucher', VoucherSchema);