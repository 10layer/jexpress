const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;

const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;
const Opportunity = require("./opportunity_model");
const Lead = require("./lead_model");
const User = require("./user_model");
const Track = require("./track_model");
const Location = require('./location_model');
const moment = require("moment");
const async = require("async");

const postFind = require('mongoose-post-find-findone');

const TaskSchema   = new Schema({
	name: String,
	category: { type: String, validate: /init|call|email|follow_up|meeting|milestone|site_visit/, index: true, default: "email", required: true },
	due_after_task: { type: ObjectId, ref: "Task" },
	due_after_days: Number,
	absolute_due_date: Date,
	original_due_date: Date,
	user_id: { type: ObjectId, ref: "User", index: true, required: true },
	opportunity_id: { type: ObjectId, ref: "Opportunity", index: true, required: true },
	location_id: { type: ObjectId, index: true, ref: "Location" },
	track_id: { type: ObjectId, ref: "Track", index: true },
	template_task_id: ObjectId,
	date_completed: Date,
	completed: { type: Boolean, default: false, index: true },
	abandoned: { type: Boolean, default: false, index: true },
	data: { type: Mixed },
	date_created: { type: Date, default: Date.now },
	due_date: { type: Date },
	_owner_id: ObjectId
}, {
	timestamps: true
});

TaskSchema.set("_perms", {
	admin: "crud",
});

TaskSchema.index( { "name": "text" } );

// Leaving this here as an example
var rawFind = (searchObj => {
	return new Promise((resolve, reject) => {
		mongoose.connection.db.collection("tasks").find(searchObj).toArray((err, result) => {
			if (err)
				return reject(err);
			return resolve(result);
		})
	})
})

var findDueDate = (task) => {
	if (!task)
		return Promise.resolve();
	if (task.category === "init")
		return Promise.resolve(task.date_created);
	if (task.absolute_due_date)
		return Promise.resolve(task.absolute_due_date);
	if (!task.due_after_task)
		return Promise.resolve(task.date_created);
	if (task.completed)
		return Promise.resolve(task.date_completed);
	let opportunity_id = (task.opportunity_id) ? task.opportunity_id._id : task.opportunity_id;
	return Task.find({ opportunity_id })
	.then(tasks => {
		let queue = [task];
		due_after_task = (task.due_after_task._id) ? task.due_after_task._id : task.due_after_task;
		var nextTask = tasks.find(t => "" + t._id === "" + due_after_task)
		var count = 0;
		while(nextTask) {
			queue.unshift(nextTask);
			nextTask = tasks.find(t => "" + t._id === "" + nextTask.due_after_task)
			count++;
			if (count > 100) {
				console.error("Infinite loop detected on task", nextTask);
				throw("Infinite loop detected");
			}
		}
		for (var x = 0; x < queue.length - 1; x++) {
			if (queue[x + 1].completed) {
				queue[x + 1].due_date = queue[x + 1].date_completed;
			} else if (queue[x + 1].absolute_due_date) {
				queue[x + 1].due_date = queue[x + 1].absolute_due_date;
			} else {
				queue[x + 1].due_date = moment(queue[x].due_date).add(queue[x + 1].due_after_days || 0, "days").toDate();
			}
		}
		return queue.pop().due_date;
	})
};

// Set wasNew
TaskSchema.pre("save", function(next) {
	var self = this;
	self.wasNew = !!self.isNew;
	next();
});

// Due Date calculations
TaskSchema.pre("save", function(next) {
	let doc = this;
	let due_date = null;
	findDueDate(doc)
	.then(result => {
		doc.due_date = result;
		if (doc.isNew)
			doc.original_due_date = doc.due_date;
		return next();
	})
	.catch(err => {
		console.trace(err);
		return next(err);
	});
});

// Set Completed Date
TaskSchema.pre("save", function(next) {
	var self = this;
	if (self.isNew)
		return next();
	if (self.completed && !self.date_completed)
		self.date_completed = new Date();
	next();
});

TaskSchema.post("findOne", async function(doc) {
	try {
		let opportunity = await Opportunity.findById(doc.opportunity_id);
		if (opportunity) doc._doc.lead_id = opportunity.lead_id;
	} catch(err) {
		console.error(err);
	}
})

TaskSchema.post("save", async (task) => {
	try {
		const tasks = await Task.find({ due_after_task: task._id });
		for(let next_task of tasks) {
			next_task.save();
		}
	} catch(err) {
		console.error(err);
	}
});

TaskSchema.post("findOne", async doc => {
	doc._doc.due_date = await findDueDate(doc);
});

TaskSchema.post("find", async docs => {
	// We need to find due_date without doing another Find
});

TaskSchema.statics.getUnique = function(opts) {
	console.log("Task - getUnique");
	return new Promise((resolve, reject) => {
		var q = {
			completed: false
		};
		if (opts.track_id) q["track_id"] = new mongoose.Types.ObjectId(opts.track_id);
	    if (opts.location_id) q["location_id"] = new mongoose.Types.ObjectId(opts.location_id);
		if (opts.user_id) q["user_id"] = new mongoose.Types.ObjectId(opts.user_id);
		var aggregate = [
	        {
				$match: q
			},
	        {
				$lookup: {
		            from: "tasks",
		            localField: "due_after_task",
		            foreignField: "_id",
		            as: "due_after_task"
	        	}
			},
	        {
	            $group: {
	                _id: "$opportunity_id",
	                task: { $first: "$$ROOT" }
	            }
	        },
			{
				$replaceRoot: {
					newRoot: "$task"
				}
			},
			{
				$lookup: {
		            from: "users",
		            localField: "user_id",
		            foreignField: "_id",
		            as: "user_id"
	        	}
			},
			{
					$unwind: "$user_id"
			},
			{
				$lookup: {
		            from: "tracks",
		            localField: "track_id",
		            foreignField: "_id",
		            as: "track_id"
	        	}
			},
			{
					$unwind: "$track_id"
			},
			{
				$lookup: {
		            from: "opportunities",
		            localField: "opportunity_id",
		            foreignField: "_id",
		            as: "opportunity_id"
	        	}
			},
			{
					$unwind: "$opportunity_id"
			},
			{
				$sort: {
					due_date: 1
				}
			},
			// {
			// 	$limit: 100
			// }
	    ]
		Task.aggregate(aggregate).exec(function(err, result) {
			if (err) {
				console.error(err)
				return reject(err);
			}
			return resolve(result);
		})
	});
}

const Task = mongoose.model('Task', TaskSchema);
module.exports = Task;
