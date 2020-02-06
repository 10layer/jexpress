var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Location = require('./location_model');
var Lead = require('./lead_model');
var Track = require('./track_model');
var User = require('./user_model');
var Ledger = require("./ledger_model");
var messagequeue = require("../libs/messagequeue");
var asyncLib = require("async");

var OpportunitySchema   = new Schema({
	name: { type: String, index: true, required: true },
	lead_id: { type: ObjectId, index: true, ref: "Lead", required: true },
	track_id: { type: ObjectId, ref: "Track", index: true, required: true },
	user_id: { type: ObjectId, ref: "User", index: true, required: true },
	location_id: { type: ObjectId, index: true, ref: "Location", required: true },
	date_created: { type: Date, default: Date.now },
	value: Number,
	assigned_to: { type: ObjectId, index: true, ref: "User" },
	probability: Number,
	abandoned: { type: Boolean, default: false, index: true },
	completed: { type: Boolean, default: false, index: true },
	date_completed: Date,
	data: mongoose.Schema.Types.Mixed,
	_deleted: { type: Boolean, default: false, index: true },
	_owner_id: ObjectId,
}, {
	timestamps: true
});

OpportunitySchema.set("_perms", {
	admin: "crud",
});

OpportunitySchema.index( { "name": "text" } );

// Set Completed Date
OpportunitySchema.pre("save", function(next) {
	var self = this;
	if (self.isNew)
		return next();
	if (self.completed && !self.date_completed)
		self.date_completed = new Date();
	next();
});

// Set wasNew
OpportunitySchema.pre("save", function(next) {
	var self = this;
	self.wasNew = !!self.isNew;
	next();
});

// Create Tracks
OpportunitySchema.pre("save", function(next) {
	let doc = this;
	var Task = require('./task_model');
	if (!doc.wasNew)
		return next();
	var track = null;
	var tasks = null;
	var newTasks = null;
	var firstTask = null;
	Track.findOne({ _id: doc.track_id })
	.then(result => {
		track = result;
		tasks = result.tasks;
		firstTask = new Task({
			name: "Opportunity created",
			category: "init",
			due_after_days: 0,
			user_id: doc.user_id,
			track_id: doc.track_id,
			opportunity_id: doc._id,
			lead_id: doc.lead_id,
			location_id: doc.location_id,
			completed: true,
			date_completed: +new Date()
		});
		return firstTask.save();
	})
	.then(result => {
		newTasks = tasks.map(task => {
			return {
				name: task.name,
				lead_id: doc.lead_id,
				category: task.category,
				due_after_days: task.due_after_days,
				user_id: doc.user_id,
				track_id: doc.track_id,
				opportunity_id: doc._id,
				location_id: doc.location_id,
				due_after_event: task.due_after_event,
				template_task_id: task._id,
			};
		});
		return new Promise((resolve, reject) => {
			asyncLib.reduce(newTasks, firstTask, (prev, curr, cb) => {
				curr.due_after_task = (curr.due_after_event === "track_start") ? firstTask._id : prev._id;
				let newTask = new Task(curr);
				newTask.save()
				.then(result => {
					cb(null, result);
				}, err => {
					console.error(err);
					cb(err);
				});
			}, (err, result) => {
				if (err) {
					console.error(err);
					return reject(err);
				}
				resolve(result);
			});
		});
	})
	.then(result => {
		next();
	})
	.catch(err => {
		console.error(err);
		next(err);
	})
});

// Pay referral reward
OpportunitySchema.pre("save", async function(next) {
	let doc = this;
	if (!doc.lead_id) // No lead
		return next();
	let lead = await Lead.findOne({ _id: doc.lead_id });
	if (!lead.referral_amount) // No amount to pay
		return next();
	if (lead.referral_date_paid) // Already paid
		return next();
	lead.referral_date_paid = new Date();
	let ledger = new Ledger({
		user_id: lead.referral_user_id,
		description: `Refer-a-friend reward for ${ lead.name + ((lead.organisation) ? " from " + lead.organisation : "") }`,
		source_type: "refer-a-friend",
		amount: lead.referral_amount,
		cred_type: "stuff",
		__user: doc.__user,
	});
	var ledgerRecord = await ledger.save();
	messagequeue.action("ledger", "post", doc.__user, ledgerRecord);
	lead.referral_date_paid = new Date();
	await lead.save();
	next();
});

module.exports = mongoose.model('Opportunity', OpportunitySchema);
