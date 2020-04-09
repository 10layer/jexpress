const Jxp = require("jxp");
var config = require('config');
var mongoose = require("mongoose");
var Websocket = require('../libs/websockets.js');
var messagequeue = require("../libs/messagequeue");
var websocket = new Websocket();

var trimuser = function(user) {
	if (!user) {
		return null;
	}
	return {
		_id: user._id,
		email: user.email,
		name: user.name,
		organisation_id: user.organisation_id,
		location_id: user.location_id
	};
};

config.pre_hooks = {
	get: (req, res, next) => {
		if (res.user && res.user.status && res.user.status !== "active") {
			res.send(401, { status: "error", error: "Unauthorized", message: "User is not active" });
			return;
		}
		next();
	},
	put: (req, res, next) => {
		if (res.user && res.user.status && res.user.status !== "active") {
			res.send(401, { status: "error", error: "Unauthorized", message: "User is not active" });
			return;
		}
		next();
	},
	post: (req, res, next) => {
		if (res.user && res.user.status && res.user.status !== "active") {
			res.send(401, { status: "error", error: "Unauthorized", message: "User is not active" });
			return;
		}
		next();
	},
	delete: (req, res, next) => {
		if (req.user && res.user.status && res.user.status !== "active") {
			res.send(401, { status: "error", error: "Unauthorized", message: "User is not active" });
			return;
		}
		next();
	}
};

config.callbacks = {
	post: function(modelname, item, user) {
		websocket.emit(modelname, "post", item._id);
		messagequeue.action(modelname, "post", trimuser(user), item);
	},
	put: function(modelname, item, user) {
		websocket.emit(modelname, "put", item._id);
		messagequeue.action(modelname, "put", trimuser(user), item);
	},
	delete: function(modelname, item, user, opts) {
		websocket.emit(modelname, "delete", item._id);
		messagequeue.action(modelname, "delete", trimuser(user), item);
	}
};

//DB connection
// ES6 promises
mongoose.Promise = Promise;

// mongodb connection
config.mongo.options = config.mongo.options || {};
let mongoOptions = Object.assign(config.mongo.options, {
	promiseLibrary: global.Promise,
	useNewUrlParser: true,
	useCreateIndex: true,
	// "poolsize": config.mongo.poolsize || 10
});

mongoose.connect(config.mongo.connection_string, mongoOptions);

var db = mongoose.connection;

// mongodb error
db.on('error', console.error.bind(console, 'connection error:'));

// mongodb connection open
db.once('open', () => {
  console.log(`Connected to Mongo at: ${new Date()}`);
});

var server = new Jxp(config);

server.listen(config.port || 3001, function() {
	console.log('%s listening at %s', "Workspaceman API", server.url);
});

module.exports = server; //For Testing
