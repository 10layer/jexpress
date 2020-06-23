const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;
const config	= require("config");

const ObjectId = mongoose.Schema.Types.ObjectId;
const Room = require("./room_model");
const User = require("./user_model");
const Guest = require("./guest_model");
const Reserve = require("./reserve_model");
const Ledger = require("./ledger_model");
const Layout = require("./layout_model");
const Invoice = require("./invoice_model");
const ProductType = require("./producttype_model");
const moment = require('moment-timezone');
const CostCalculator = require("../libs/costcalculator");

moment.tz.setDefault(config.timezone || "Africa/Johannesburg");

const BookingSchema   = new Schema({
	room_id: { type: ObjectId, ref: "Room", required: true, index: true },
	start_time: { type: Date, required: true, index: true },
	end_time: { type: Date, required: true, index: true },
	title: { type: String, required: true },
	description: String,
	message: String,
	attendee_id: [{ type: ObjectId, ref: "User" }],
	guest_id: [{ type: ObjectId, ref: "Guest" }],
	external_attendees: [String],
	user_id: { type: ObjectId, ref: "User" },
	cost: Number,
	created: { type: Date, default: Date.now },
	public_event: { type: Boolean, default: false },
	sponsored_event: { type: Boolean, default: false },
	internal_event: { type: Boolean, default: false },
	event_client: { type: Boolean, default: false },
	img: String,
	layout_id: { type: ObjectId, ref: "Layout" },
	booking_url: String,
	website: String,
	radius_username: String,
	radius_password: String,
	is_invoice: { type: Boolean, default: false},
	invoice_id: { type: ObjectId, ref: "Invoice" },
	external_id: String,
	hidden: { type: Boolean, default: false },
	ical_source: { type: String, index: true },
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
	_version: { type: Number, default: 0 },
	_import_ref: String,
}, {
	timestamps: true
});

BookingSchema.set("_perms", {
	admin: "crud",
	owner: "crud",
	user: "cr",
});

const getBookings = params => {
	var Booking = mongoose.model("Booking", BookingSchema);
	return new Promise((resolve, reject) => {
		Booking.find(params, (err, result) => {
			if (err)
				return reject(err);
			return resolve(result);
		});
	});
};

const getLedger = params => {
	return new Promise((resolve, reject) => {
		Ledger.findOne(params, (err, result) => {
			if (err)
				return reject(err);
			return resolve(result);
		});
	});
};

const getRoom = params => {
	return new Promise((resolve, reject) => {
		Room.findOne(params, (err, result) => {
			if (err)
				return reject(err);
			return resolve(result);
		});
	});
};

const postLedger = params => {
	var ledger = Ledger(params);
	return new Promise((resolve, reject) => {
		ledger.save(function(err, result) {
			if (err)
				return reject(err);
			return resolve(result);
		});
	});
};

// Check for conflicts
BookingSchema.pre("save", async function() {
	try {
		var transaction = this;
		//If this transaction is deleted, don't even worry
		if (transaction._deleted)
			return;
		if (new Date(transaction.start_time).getTime() > new Date(transaction.end_time).getTime()) {
			transaction.invalidate("start_time", "start_time cannot be greater than than end_time");
			throw("start_time greater than than end_time");
		}
		transaction.user_id = transaction.user_id || transaction.__user._id;
		if ((!transaction.__user.admin) && (String(transaction.__user._id) !== String(transaction.user_id))) {
			transaction.invalidate("user_id", "user not allowed to assign appointment to another user");
			throw("user not allowed to assign appointment to another user");
		}
		const bookings = (await getBookings({ end_time: { $gt: transaction.start_time }, start_time: { $lt: transaction.end_time }, room_id: transaction.room_id, _deleted: false })).filter(booking_id => booking_id + "" !== transaction._id + "");
		if (!bookings.length) return;
		const room = await Room.findOne(transaction.room_id).exec();
		if (bookings.length >= room.number_available) {
			console.error("Booking clash", { bookings, transaction });
			throw("This booking clashes with an existing booking");
		}
	} catch(err) {
		console.error(err);
		return Promise.reject(err);
	}
});

// Save in ledger
BookingSchema.pre("save", async function(f, item) {
	const transaction = this;
	//Are we invoicing this? If so, don't charge the Space account
	if (transaction.invoice)
		return;
	//Is this free? If so, cool, don't do any more
	if (!transaction.cost)
		return;
	if (transaction._deleted) //Probably a refund...
		return;
	try {
		const ledger = await getLedger({
			source_type: "booking",
			source_id: transaction._id
		});
		if (ledger) {
			await ledger.remove();
		}
		const room = await getRoom({ _id: transaction.room_id });
		//Reserve the moneyz
		//We do this here, because if it fails we don't want to process the payment.
		var description = "Booking: " + transaction.title + " :: " + room.name + ", " + moment(transaction.start_time).format("dddd MMMM Do, H:mm") + " to " + moment(transaction.end_time).format("dddd MMMM Do, H:mm");
		if (parseInt(transaction._owner_id) !== parseInt(transaction.user_id)) {
			description += " (Booked by Reception)";
		}
		reserve_expires = moment(transaction.start_time).subtract(24, "hours");
		await postLedger({
			user_id: transaction.user_id,
			description: description,
			partner_reference: transaction._id,
			amount: Math.abs(transaction.cost) * -1, // Ensure negative value
			cred_type: "space",
			source_type: "booking",
			source_id: transaction._id,
			reserve: true,
			reserve_expires: reserve_expires.toISOString(),
			__user: transaction.__user
		});
	} catch(err) {
		return Promise.reject(err);
	};
});

var deleteReserve = function(transaction) {
	// console.log("Remove called, Going to remove reserve");
	var item = null;
	Ledger.findOne({
		source_type: "booking",
		source_id: transaction._id
	})
	.then(result => {
		item = result;
		if (!item) {
			console.error("Could not find Reserve", transaction);
			return new Error("Could not find Reserve");
		}
		// console.log("Deleting", item);
		item.remove();
	})
	.catch(err => {
		console.trace("Error", err);
	});
};

BookingSchema.post("save", function(transaction) {
	if (transaction._deleted && !transaction.invoice) {
		console.log("Fake delete but still delete reserve");
		deleteReserve(transaction);
	}
});

BookingSchema.post("remove", function(transaction) { //Keep our running total up to date
	if (!transaction.invoice)
		deleteReserve(transaction);
});

const calculate_cost = async function(room, start_time, end_time) {
	try {
		const cost = await CostCalculator(room, start_time, end_time);
		return cost;
	} catch(err) {
		console.error(err);
		return null;
	}
}

BookingSchema.statics.available = async (data) => {
	const all_rooms = await Room.find({ location_id: data.location_id, _deleted: false, private: false }).populate("product_id").exec();
	const overlapping_bookings = await Booking.find({ end_time: { $gt: data.start_time }, start_time: { $lt: data.end_time }});
	const available_rooms = [];
	for(let room of all_rooms.slice(1)) {
		if (overlapping_bookings.filter(booking => booking.room_id + "" === room._id + "").length < room.number_available) {
			try {
				room._doc.total_cost = await calculate_cost(room._id, data.start_time, data.end_time);
			} catch(err) {
				console.log("Could not get cost for room", room._id);
			}
			available_rooms.push(room);
		}
	}
	return available_rooms;
}

const Booking = mongoose.model('Booking', BookingSchema);
module.exports = Booking;
