const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;

const ObjectId = mongoose.Schema.Types.ObjectId;
const SpaceType = require("./spacetype_model");
const Room = require("./room_model");
const Claylock = require("./claylock_model");

const SpaceSchema   = new Schema({
	name: String,
	spacetype_id: { type: ObjectId, ref: 'SpaceType', required: true },
	room_id: [{ type: ObjectId, ref: 'Room' }],
	claylock_id: [{ type: ObjectId, ref: 'Claylock' }],
	total_value: Number,
	meters_squared: Number,
	seats: Number,
	_owner_id: ObjectId,
	_deleted: { type: Boolean, default: false, index: true },
}, {
	toObject: {
		virtuals: true
	},
	toJSON: {
		virtuals: true
	},
	timestamps: true
});

SpaceSchema.set("_perms", {
	admin: "r",
	setup: "crud",
	user: "r"
});

SpaceSchema.post("findOne", async function(doc) {
	const Room = require("./room_model"); // I have no idea why the previous def isn't working
	try {
		let rooms = [];
		if (doc.room_id) {
			if (Array.isArray(doc.room_id)) {
				for (let room_id of doc.room_id) {
					rooms.push(await Room.findOne({ _id: room_id }).populate("product_id", "price"));
				}
			} else {
				rooms.push(await Room.findOne({ _id: doc.room_id }).populate("product_id", "price"));
			}
		}
		doc.total_value = 0;
		doc.seats = 0;
		doc.meters_squared = 0;
		for (room of rooms) {
			doc.seats += room.capacity;
			doc.meters_squared += room.meters_squared;
			if (room.product_id)
				doc.total_value += room.product_id.price;
		}
	} catch(err) {
		console.error(err);
		return Promise.reject(err);
	}
});

SpaceSchema.post("find", async function (rows) {
	const Room = require("./room_model"); // I have no idea why the previous def isn't working
	try {
		const allrooms = await Room.find().populate("product_id", "price");
		for (doc of rows) {
			let rooms = [];
			if (doc.room_id) {
				if (Array.isArray(doc.room_id)) {
					for (let room_id of doc.room_id) {
						rooms.push(allrooms.find(room => room._id + "" === room_id + ""));
					}
				} else {
					rooms.push(allrooms.find(room => room._id + "" === doc.room._id + ""));
				}
			}
			doc.total_value = 0;
			doc.seats = 0;
			doc.meters_squared = 0;
			for (room of rooms) {
				doc.seats += room.capacity;
				doc.meters_squared += room.meters_squared;
				if (room.product_id)
					doc.total_value += room.product_id.price;
			}
		}
	} catch (err) {
		console.error(err);
		return Promise.reject(err);
	}
});

SpaceSchema.statics.usage = function (opts) {
	console.log("Find usage of each space");
	const License = require("./license_model");
	return new Promise((resolve, reject) => {
		var aggregate = [{
			$match: {
				space_id: {
					$exists: true
				},
				'_deleted': false
			}
		}, {
			$group: {
				_id: "$space_id",
				count: {
					$sum: 1
				}
			}
		}, {
			$lookup: {
				from: 'spaces',
				localField: '_id',
				foreignField: '_id',
				as: 'space'
			}
		}, {
			$unwind: "$space"
		}, {
			$project: {
				space_name: "$space.name",
				space_id: "$space._id",
				used: "$count"
			}
		}]
		License.aggregate(aggregate).exec(function (err, result) {
			if (err) {
				console.error(err)
				return reject(err);
			}
			return resolve(result);
		})
	})
}

module.exports = mongoose.model('Space', SpaceSchema);
