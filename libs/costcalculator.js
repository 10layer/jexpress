const config = require("config");
const Moment = require("moment-timezone");
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);
const timezone = (config.timezone || "Africa/Johannesburg");
const roundup = require("roundup");
moment.tz.setDefault(timezone);


const Room = require("../models/room_model");
const Product = require("../models/product_model");
const ProductType = require("../models/producttype_model");

const unit_types = {
    "m": "minute",
    "h": "hour",
    "d": "day"
}

const CostCalculator = async (room_id, start_time, end_time) => {
    try {
        const range = moment.range(start_time, end_time);
        const room = await Room.findById(room_id);
        if (!room) throw "Room not found";
        const product = await Product.findById(room.product_id);
        if (!product) throw "Product not found";
        const product_type = await ProductType.findById(product.producttype_id);
        const [slot_size, unit] = product_type.bookable_time_units.match(/([\d\.]+)([a-z])/).slice(1,3);
        if (!unit_types[unit]) throw "Can't find unit type";
        // How many slots do we need?
        slots = [];
        let tot = 0;
        for (let slot of range.by(unit_types[unit], { step: slot_size })) {
            slots.push({ slot: slot.toString(), cost: room.cost });
            tot += room.cost;
        }
        tot = roundup(tot, 2);
        console.log({ tot });
        return tot;
    } catch(err) {
        console.log("Error on room");
        console.error(err);
        return null;
    }
}

module.exports = CostCalculator;