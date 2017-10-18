var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Room = require("./room_model");
var User = require("./user_model");
var Guest = require("./guest_model");
var Reserve = require("./reserve_model");
var Ledger = require("./ledger_model");
var Layout = require("./layout_model");
var moment = require('moment-timezone');

moment.tz.setDefault("SAST");

var BookingSchema   = new Schema({
	room: { type: ObjectId, ref: "Room", required: true, index: true },
	start_time: { type: Date, required: true, index: true },
	end_time: { type: Date, required: true, index: true },
	title: { type: String, required: true },
	description: String,
	message: String,
	attendees: [{ type: ObjectId, ref: "User" }],
	guests: [{ type: ObjectId, ref: "Guest" }],
	external_attendees: [String],
	user: { type: ObjectId, ref: "User" },
	cost: Number,
	created: { type: Date, default: Date.now },
	public_event: { type: Boolean, default: false },
	event_client: { type: Boolean, default: false },
	img: String,
	layout: { type: ObjectId, ref: "Layout" },
	booking_url: String,
	website: String,
	radius_username: String,
	radius_password: String,
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
	_version: { type: Number, default: 0 },
});

BookingSchema.set("_perms", {
	admin: "crud",
	owner: "crud",
	user: "cr",
});

function collision_detection(appointment, appointments) {
	if (!appointments) {
		return false;
	}
	var appointment_index = appointments.indexOf(appointment);
	for(var x = 0; x < appointments.length; x++) {
		if (x != appointment_index) {
			if (appointment.start_time < appointments[x].end_time && appointments[x].start_time < appointment.end_time) {
				console.error("Collision", appointments[x].start_time, appointments[x].end_time);
				console.log("Appointment", appointment.start_time, appointment.end_time);
				return true;
			}
		}
	}
	return false;
}

var getBookings = params => {
	var Booking = mongoose.model("Booking", BookingSchema);
	return new Promise((resolve, reject) => {
		Booking.find(params, (err, result) => {
			if (err)
				return reject(err);
			return resolve(result);
		});
	});
};

var getLedger = params => {
	return new Promise((resolve, reject) => {
		Ledger.findOne(params, (err, result) => {
			if (err)
				return reject(err);
			return resolve(result);
		});
	});
};

var getRoom = params => {
	return new Promise((resolve, reject) => {
		Room.findOne(params, (err, result) => {
			if (err)
				return reject(err);
			return resolve(result);
		});
	});
};

var postLedger = params => {
	var ledger = Ledger(params);
	return new Promise((resolve, reject) => {
		ledger.save(function(err, result) {
			if (err) 
				return reject(err);
			return resolve(result);
		});
	});
};

BookingSchema.pre("save", function(next) {
	var transaction = this;
	if (new Date(transaction.start_time).getTime() > new Date(transaction.end_time).getTime()) {
		transaction.invalidate("start_time", "start_time cannot be greater than than end_time");
		return next(new Error("start_time greater than than end_time"));
	}
	transaction.user = transaction.user || transaction.__user._id;
	if ((!transaction.__user.admin) && (String(transaction.__user._id) !== String(transaction.user))) {
		transaction.invalidate("user", "user not allowed to assign appointment to another user");
		return next(new Error("user not allowed to assign appointment to another user"));
	}
	var Booking = mongoose.model("Booking", BookingSchema);
	getBookings({ end_time: { $gt: transaction.start_time }, start_time: { $lt: transaction.end_time }, room: transaction.room, _deleted: false })
	.then(result => {
		if (result.length && ("" + transaction._id !== "" + result[0]._id) && (!transaction._deleted)) {
			console.error("Booking clash", result[0]._id, transaction._id);
			throw("This booking clashes with an existing booking");
		}
		return getLedger({
			source_type: "booking",
			source_id: transaction._id
		});
	})
	.then(ledger => {
		if (ledger) {
			ledger.remove();
		}
		
		return getRoom({ _id: transaction.room });
	})
	.then(room => {
		//Is this free? If so, cool, don't do any more
		if (!transaction.cost) {
			return true;
		}

		//Reserve the moneyz
		//We do this here, because if it fails we don't want to process the payment.
		var description = "Booking: " + transaction.title + " :: " + room.name +  ", " + moment(transaction.start_time).tz("Africa/Johannesburg").format("dddd MMMM Do, H:mm") + " to " + moment(transaction.end_time).tz("Africa/Johannesburg").format("H:mm");
		if (parseInt(transaction._owner_id) !== parseInt(transaction.user)) {
			description += " (Booked by Reception)";
		}
		reserve_expires = moment(transaction.start_time).subtract(24, "hours");
		return postLedger({
			user_id: transaction.user,
			description: description,
			amount: Math.abs(transaction.cost) * -1, // Ensure negative value
			cred_type: "space",
			source_type: "booking",
			source_id: transaction._id,
			reserve: true,
			reserve_expires: reserve_expires.format("x"),
			__user: transaction.__user
		});
	})
	.then(result => {
		next();
	})
	.catch(err => {
		return next(new Error(err));
	});
});

var deleteReserve = function(transaction) {
	console.log("Remove called, Going to remove reserve");
	console.log(transaction);
	var item = null;
	Ledger.findOne({
		source_type: "booking",
		source_id: transaction._id
	})
	.then(result => {
		item = result;
		if (!item) {
			console.log("Could not find Reserve");
			return new Error("Could not find Reserve");
		}
		console.log("Deleting", item);
		item.remove();
	})
	.catch(err => {
		console.trace("Error", err);
	});
};

BookingSchema.post("save", function(transaction) {
	// console.log("Transaction", transaction);
	if (transaction._deleted) {
		console.log("Fake delete but still delete reserve");
		deleteReserve(transaction);
	}
});

BookingSchema.post("remove", function(transaction) { //Keep our running total up to date
	deleteReserve(transaction);
});

module.exports = mongoose.model('Booking', BookingSchema);