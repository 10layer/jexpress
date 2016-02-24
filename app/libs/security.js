var Q = require("q");
var APIKey = require('../models/apikey_model');
var bunyan = require("bunyan");
var bcrypt = require('bcrypt');
var overviewLog = bunyan.createLogger({
	name: "jexpress.overview"
});
var log = bunyan.createLogger({ 
	name: "jexpress",
	// serializers: {req: bunyan.stdSerializers.req}
});
var Groups = require("../models/usergroups_model.js");
var User = require('../models/user_model');

var basicAuth = function(req) {
	if (!req.headers.authorization) {
		return false;
	}
	try {
		auth = req.headers.authorization.split(" ")[1];
	} catch(err) {
		return false;
	}
	decoded = new Buffer(auth, 'base64').toString();
	return decoded.split(":");
}

var fail = function(res, code, message) {
	res.status(code).send({ status: "error", message: message });
}

var Security = {
	basicAuth: basicAuth,
	encPassword: function(password) {
		return hash = bcrypt.hashSync(password, 4);
	},
	generateApiKey: function(user) {
		var deferred = Q.defer();
		//Generate new API key
		var apikey = new APIKey();
		apikey.user_id = user._id;
		apikey.apikey = require('rand-token').generate(16);

		apikey.save(function(err) {
			if (err) {
				log.error(err);
				deferred.reject(err);
				return;
			}
			overviewLog.info({ action_id: 1, action: "User logged on", user: user });
			deferred.resolve(apikey);
		});
		return deferred.promise;
	},
	apiKeyAuth: function(req, res, next) {
		if (req.headers.authorization) { // Basic Auth 
			var ba = basicAuth(req);
			if (Array.isArray(ba) && (ba.length == 2)) {
				var email = ba[0];
				var password = ba[1];
				User.findOne({ email: email }, function(err, user) {
					if (err) {
						log.error(err); 
						return done(err); 
					}
					if (!user) {
						log.error("Incorrect username");
						return fail(res, 403, "Unauthorized");
						return;
					}
					try {
						if (!bcrypt.compareSync(password, user.password)) {
							log.error("Incorrect password");
							return fail(res, 403, "Unauthorized");
							return;
						}
					} catch (err) {
						log.error(err);
						return fail(res, 403, "Unauthorized");
						return;
					}
					req.user = user;
					Groups.findOne({ user_id: user._id }, function(err, userGroup) {
						if (err) {
							return fail(res, 500, err);
						}
						req.groups = (userGroup && userGroup.groups) ? userGroup.groups : [];
						next();
					});
				});
			}
		} else {
			if (!req.query.apikey) {
				log.error("No auth method found");
				return fail(res, 403, "Unauthorized");
			}
			var apikey = req.query.apikey;
			if (!apikey) {
				return fail(res, 403, "Unauthorized");
			}
			console.log("Logging on with apikey", apikey);
			APIKey.findOne({ apikey: apikey }, function(err, apikey) {
				if (err) {
					return fail(res, 500, err);
				}
				if (!apikey) {
					return fail(res, 403, "Unauthorized");
				}
				User.findOne({ _id: apikey.user_id }, function(err, user) {
					if (err) {
						return fail(res, 500, err);
					}
					if (!user) {
						return fail(res, 403, "Unauthorized");
					}
					req.user = user;
					req.apikey = apikey.apikey;
					var Groups = require("../models/usergroups_model.js");;
					Groups.findOne({ user_id: user._id }, function(err, userGroup) {
						if (err) {
							return fail(res, 500, err);
						}
						req.groups = (userGroup && userGroup.groups) ? userGroup.groups : [];
						return next();
					});
				});
			});
		}
	},
	auth: function(req, res, next) {
		//Set up our child logger
		req.log = log.child({ user: req.user });
		req.log.debug("Started Auth");
		// Check against model as to whether we're allowed to edit this model
		var perms = req.Model.schema.get("_perms");
		var passed = {
			admin: false,
			owner: false,
			user: false,
			all: false
		};
		for (i in perms) { // Add any user-defined perms to our passed table
			passed[i] = false;
		}
		if (req.method == "GET") {
			var method = "r";
		} else if (req.method == "POST") {
			var method = "c";
		} else if (req.method == "PUT") {
			var method = "u";
		} else if (req.method == "DELETE") {
			var method = "d";
		} else {
			req.log.error("Unsupported operation", req.method);
			return fail(res, 500, "Unsupported operation: " + req.method);
			return;
		}
		req.authorized = false;
		req.log.debug("perms", perms.admin);
		//If no perms are set, then this isn't an available model
		if (!perms.admin) {
			req.log.error("Model not available");
			return fail(res, 500, "Model not available");
			return;
		}
		//First check if "all" is able to do this. If so, let's get on with it.
		if (perms["all"]) {
			if (perms["all"].indexOf(method) !== -1) {
				req.log.info("Matched permission 'all':" + method);
				req.authorized = true;
				next();
				return;
			}
		}
		
		//This isn't an 'all' situation, so let's log the user in and go from there
		Security.apiKeyAuth(req, res, function() {
			//Let's check perms in this order - admin, user, group, owner
			//Admin check
			if ((req.user.admin) && (perms["admin"]) && (perms["admin"].indexOf(method) !== -1)) {
				req.log.info("Matched permission 'admin':" + method);
				req.authorized = true;
				next();
				return;
			}
			//User check
			if ((perms["user"]) && (perms["user"].indexOf(method) !== -1)) {
				req.log.info("Matched permission 'user':" + method);
				req.authorized = true;
				next();
				return;
			}
			//Group check
			req.groups.forEach(function(group) {
				if ((perms[group]) && (perms[group].indexOf(method) !== -1)) {
					req.log.info("Matched permission '" + group + "':" + method);
					req.authorized = true;
					next();
					return;
				}
			});
			//Owner check
			var owner_id = false;
			req.Model.findById(req.params.item_id, function(err, item) {
				if (err) {
					req.log.error(err);
					return fail(res, 500, err);
				}
				if ((item) && (item._owner_id) && (item._owner_id.toString() == req.user._id.toString()) && ((perms["owner"]) && (perms["owner"].indexOf(method) !== -1))) {
						req.log.info("Matched permission 'owner':" + method);
						req.authorized = true;
						next();
						return;
				} else {
					req.log.error("All authorizations failed");
					if(!req.authorized) {
						return fail(res, 403, "Authorization failed");
						return;
					}
				}
			});
		// }, function(code, err) {
		// 	req.log.error({ msg: "API key fail", code: code, err: err });
		// 	res.status(code).send(err);
		// 	return;
		});
	}
}

module.exports = Security;