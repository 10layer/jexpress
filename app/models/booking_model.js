var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;
var Room = require("./room_model");
var User = require("./user_model");
var Reserve = require("./reserve_model");
var moment = require('moment-timezone');

moment.tz.setDefault("SAST");

var BookingSchema   = new Schema({
	room: { type: Objectid, ref: "Room" },
	start_time: Date,
	end_time: Date,
	title: String,
	description: String,
	message: String,
	attendees: [{ type: Objectid, ref: "User" }],
	external_attendees: [String],
	user: { type: Objectid, ref: "User" },
	cost: Number,
	created: { type: Date, default: Date.now },
	_owner_id: Objectid,
	_deleted: { type: Boolean, default: false, index: true },
});

BookingSchema.set("_perms", {
	admin: "crud",
	owner: "crud",
	user: "cr",
});

BookingSchema.pre("save", function(next) {
	console.log("Looking for existing reserve");
	transaction = this;
	try {
		
		//Remove the reserve if it already exists
		Reserve.findOne({
			source_type: "booking",
			source_id: transaction._id
		}, function(err, item) {
			if (item) {
				console.log("Found existing reserve, removing it");
				item.remove();
			}
		});
		
	} catch(err) {
		console.log("Error", err);
		// throw(err);
	}

	//Is this free? If so, cool, don't do any more
	if (!transaction.cost) {
		return next();
	}

	//Reserve the moneyz
	//We do this here, because if it fails we don't want to process the payment.
	try {
		Room.findById(transaction.room).populate('location').exec(function(err, room) {
			console.log(transaction);
			var description = "Booking: " + transaction.title + " :: " + room.location.name + ", " + room.name +  ", " + moment(transaction.start_time).tz("Africa/Johannesburg").format("dddd MMMM Do, H:mm") + " to " + moment(transaction.end_time).tz("Africa/Johannesburg").format("H:mm");
			if (parseInt(transaction._owner_id) !== parseInt(transaction.user)) {
				description += " (Booked by Reception)";
			}
			var reserve = Reserve({
				user_id: transaction.user,
				description: description,
				amount: transaction.cost * -1,
				cred_type: "space",
				source_type: "booking",
				source_id: transaction._id
			});
			console.log(reserve);
			reserve.save(function(err) {
				if (err) {
					console.error(err);
					return next(err);
				}
				return next();
			});
		});
	} catch(err) {
		console.log("Error", err); 
		//Roll back booking

	}
});

var deleteReserve = function(transaction) {
	console.log("Remove called, Going to remove reserve");
	console.log(transaction);
	try {
		Reserve.findOne({
			source_type: "booking",
			source_id: transaction._id
		}, function(err, item) {
			if (err) {
				console.log("Error", err);
				return;
			}
			if (!item) {
				console.log("Could not find Reserve");
				return;
			}
			console.log("Deleting", item);
			item.remove();
		});
	} catch(err) {
		console.log("Error", err);
		// throw(err);
	}
}

BookingSchema.post("save", function(transaction) {
	console.log("Transaction", transaction);
	if (transaction._deleted) {
		deleteReserve(transaction);
	}
});

BookingSchema.post("remove", function(transaction) { //Keep our running total up to date
	deleteReserve(transaction);
});

module.exports = mongoose.model('Booking', BookingSchema);