/* 
===============
API Engineroom 
===============
*/

/* 

This Express route supports CRUD operations without having to define controllers for each type. 

You do still have to define Mongoose models, which we expect to find at ../models.

Supports the following verbs:
- GET - Gets a list or a single object
- POST - Creates a single object
- PUT - Updates a single object
- DELETE - Deletes a single object

The format is /:modename for a GET list and a POST.
The format is /:modelname/:_id for a GET item, PUT and DELETE.

When GETting a list, you can add a Filter as a parameter, eg. /:modelname?filter[field]=value

To filter with $gte, $lte or similar, use a colon to divide the operator and query. Eg. /:modelname?filter[field]=$gte:value

There's also a special route, /:modelname/_describe, which returns the model

User model should look a bit like:

```
var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var UserSchema   = new Schema({
	name: String,
	email: String,
	password: String,
	apikey: String,
	admin: Boolean,
	temp_hash: String,
});

UserSchema.set("_perms", {
	admin: "rw",
	owner: "rw",
	user: "r"
});

module.exports = mongoose.model('User', UserSchema);
```

You can set permissions per model by setting _perms on the schema. Eg:
```
TestSchema.set("_perms", {
	admin: "rw",
	owner: "rw",
	user: "r",
	all: "r"
});
```

If you want to use the owner property, you need to have _owner_id in your model.
Eg. 
```
_owner_id: mongoose.Schema.Types.ObjectId;
```

Possible permission keys are:
"admin" | anyone with "admin" set to true 
"owner" | on a per-record basis, the person who originally wrote the record
"user"  | any registered user
"all"   | the w0rld

Possible values are:
"c"  | create
"r"  | read
"u"  | update
"d"  | delete

*/

var express = require('express');
var passport = require('passport')
var BasicStrategy = require('passport-http').BasicStrategy;
var LocalApiKeyStrategy = require('passport-localapikey').Strategy;
// var auth = require('./auth');
var User = require('../models/user_model');
var APIKey = require('../models/apikey_model');
var bcrypt = require('bcrypt');
var router = express.Router();
var config = require('../../config');
var querystring = require('querystring');

var modelname = "";
var Model = false;

var deny = function(req, res, next) {
	console.log("Denying auth");
	res.status(403).send("Unauthorized");
	req.authorized = false;
}

var encPassword = function(password) {
	return hash = bcrypt.hashSync(password, 4);
}

var changeUrlParams = function(req, key, val) {
	console.log(req);
	var q = req.query;
	q[key] = val;
	var pathname = require("url").parse(req.url).pathname;
	return req.protocol + '://' + req.get('host') + req._parsedOriginalUrl.pathname + "?" + querystring.stringify(q);
}

/* Password recovery */
router.route("/login/recover").post(function(req, res, next) {
	var email = req.body.email;
	if (!email) {
		console.log("Missing email");
		deny(req, res, next);
		return;
	}
	User.findOne({ email: email }, function(err, user) {
		if (err) { console.log("Err"); return done(err); }
		if (!user) {
			console.log("Incorrect username");
			deny(req, res, next);
			return;
		}
		user.temp_hash = require('rand-token').generate(16);
		user.save(function(err) {
			if (err) { console.log("Err"); return done(err); }
			var nodemailer = require('nodemailer');
			var smtpTransport = require('nodemailer-smtp-transport');
			// create reusable transporter object using SMTP transport
			var transporter = nodemailer.createTransport(smtpTransport({
				host: config.smtp_server,
				port: 25,
				auth: {
					user: config.smtp_username,
					pass: config.smtp_password,
				},
				// secure: true,
				tls: { rejectUnauthorized: false }
			}));
			transporter.sendMail({
				from: config.smtp_from,
				to: user.email,
				subject: "Password Recovery",
				text: "Someone (hopefully you) requested a password reset. Please click on the following url to recover your password. If you did not request a password reset, you can ignore this message. \n" + config.password_recovery_url + "/" + user.temp_hash,
			},
			function(result) {
				console.log("Mailer result", result);
			});
			res.send("Sent recovery email");
		});
	});
});

router.route("/login/reset").post(function(req, res, next) {
	var password = req.body.password;
	var temp_hash = req.body.temp_hash;
	if (temp_hash.length < 16) {
		console.log("Hash error");
		deny(req, res, next);
		return;
	}
	if (password.length < 4) {
		console.log("Password too short");
		deny(req, res, next);
		return;
	}
	User.findOne({ temp_hash: temp_hash }, function(err, user) {
		if (err) { console.log("Err"); return done(err); }
		if (!user) {
			console.log("Hash not found");
			deny(req, res, next);
			return;
		}
		user.password = encPassword(password);
		user.temp_hash = "";
		user.save(function(err) {
			if (err) { console.log("Err"); return done(err); }
			res.send("User updated");
			return;
		});
	})
});

router.route("/login/logout").get(function(req, res, next) {
	var apikey = req.query.apikey;
	APIKey.findOne({ apikey: apikey }, function(err, apikey) {
		if (err) { 
			console.log("Err", err);
			deny(req, res, next);
			return;
		}
		if (!apikey) {
			console.log("API Key not found");
			deny(req, res, next);
			return;
		}
		apikey.remove(function(err, item) {
			if (err) { 
				console.log("Err", err);
				deny(req, res, next);
				return;
			}
			res.send("User logged out");
		});
	});
});

/* Our login endpoint. I'm afraid you can never have a model called login. */
router.use("/login", function(req, res, next) {
	var email = req.body.email;
	var password = req.body.password;
	if ((!password) || (!email)) {
		console.log("Missing email or password");
		deny(req, res, next);
		return;
	}
	User.findOne({ email: email }, function(err, user) {
		if (err) { console.log("Err"); return done(err); }
		if (!user) {
			console.log("Incorrect username");
			deny(req, res, next);
			return;
		}
		if (!bcrypt.compareSync(password, user.password)) {
			console.log("Incorrect password");
			deny(req, res, next);
			return;
		}
		//Generate new API key
		var apikey = new APIKey();
		apikey.user_id = user._id;
		apikey.apikey = require('rand-token').generate(16);

		apikey.save(function(err) {
			if (err) {
				console.log("Error", err);
				deny(req, res, next);
				return;
			}
			// console.log(user);
			res.json(apikey);
		});
	});
});

/* This middleware prepares the correct Model */
router.use('/:modelname', function(req, res, next) {
	modelname = req.params.modelname;
	try {
		Model = require('../models/' + modelname + "_model");
		next();
	} catch(err) {
		res.status(404).send("Model not found");

	}
});

/* Deal with Passwords. Just always encrypt anything called 'password' */
router.use('/:modelname', function(req, res, next) {

	if (req.body["password"]) {
		var password = encPassword(req.body["password"]);
		req.body["password"] = password;
		console.log("Password generated: " + password)
	}
	next();
});

/* This is our security module. See header for instructions */
var auth = function(req, res, next) {
	console.log("permAuth");
	// Check against model as to whether we're allowed to edit this model
	var user = req.user;
	var perms = Model.schema.get("_perms");
	var passed = {
		admin: false,
		owner: false,
		user: false,
		all: false
	};
	if (req.method == "GET") {
		var method = "r";
	} else if (req.method == "POST") {
		var method = "c";
	} else if (req.method == "PUT") {
		var method = "u";
	} else if (req.method == "DELETE") {
		var method = "d";
	} else {
		console.log("Unsupported method", req.method);
		deny(req, res, next);
		return;
	}
	req.authorized = false;
	//If no perms are set, then this isn't an available model
	console.log("perms", perms.admin);
	if (!perms.admin) {
		console.log("Model not available");
		deny(req, res, next);
		return;
	}
	//First check if "all" is able to do this. If so, let's get on with it.
	if (perms["all"]) {
		if (perms["all"].indexOf(method) !== -1) {
			console.log("Matched permission 'all':", method);
			req.authorized = true;
			next();
			return;
		}
	}
	//This isn't an 'all' situation, so let's log the user in and go from there
	if (req.query.apikey) {
		var apikey = req.query.apikey;
		APIKey.findOne({ apikey: apikey }, function(err, apikey) {
			if (err) { 
				console.log("Err", err);
				deny(req, res, next);
				return;
			}
			if (!apikey) {
				console.log("API Key not found");
				deny(req, res, next);
				return;
			}
			User.findOne({ _id: apikey.user_id }, function(err, user) {
				if (err) { 
					console.log("Err", err);
					deny(req, res, next);
					return;
				}
				if (!user) {
					console.log("User not found");
					deny(req, res, next);
					return;
				}
				req.user = user;
				//Let's check perms in this order - admin, user, owner
				//Admin check
				if ((perms["admin"]) && (perms["admin"].indexOf(method) !== -1)) {
					console.log("Matched permission 'admin':", method);
					req.authorized = true;
					next();
					return;
				}
				//User check
				if ((perms["user"]) && (perms["user"].indexOf(method) !== -1)) {
					console.log("Matched permission 'user':", method);
					req.authorized = true;
					next();
					return;
				}
				//Owner check
				var owner_id = false;
				Model.findById(req.params.item_id, function(err, item) {
					if (err) {
						console.log("Err", err);
					}
					if ((item) && (item._owner_id) && (item._owner_id.toString() == user._id.toString()) && ((perms["owner"]) && (perms["owner"].indexOf(method) !== -1))) {
							console.log("Matched permission 'owner':", method);
							req.authorized = true;
							next();
							return;
					} else {
						console.log("All authorizations failed");
						if(!req.authorized) {
							deny(req, res, next);
							return;
						}
					}
				});
			});
		});
	} else {
		console.log("No API key");
		deny(req, res, next);
		return;
	}
};

function format_filter(filter) {
	if (typeof(filter) == "object") {
		Object.keys(filter).forEach(function(key) {
			var val = filter[key];
			try {
				if (val.indexOf(":") !== -1) {
					var tmp = val.split(":");
					filter[key] = {}
					filter[key][tmp[0]] = tmp[1];
				}
				if (typeof(val) == "object") {
					result = format_filter(val);
					filter[key] = {};
					for(var x = 0; x < result.length; x++) {
						filter[key][Object.keys(result[x])[0]]=result[x][Object.keys(result[x])[0]];
					}
				}
			} catch(err) {
				// res.status(500).send("An error occured:" + err)
				throw(err);
			}
		});
	}
	console.log("Filter:", filter);
	return filter;
}

/* Routes */
router.route('/:modelname')
	.post(auth, function(req, res) {
		try {
			var item = new Model();
			for(prop in item) {
				if (req.body[prop]) {
					console.log(prop, req.body[prop]);
					item[prop] = req.body[prop];
				}
			}
			// item.add("_owner_id");
			if (req.user) {
				item._owner_id = req.user._id;
			}
			item.save(function(err) {
				if (err) {
					throw(err);
				} else {
					res.json({ message: modelname + " created ", data: item });
				}
			});
		} catch(err) {
			res.status(500).send("An error occured:" + err)
		}
	})
	.get(auth, function(req, res) {
		try {
			var filters = format_filter(req.query.filter, res);
		} catch(err) {
			res.status(500).send("An error occured:" + err)
		}
		Model.find(filters).count(function(err, count) {
			var result = {};
			result.count = count;
			var q = Model.find(filters);
			var limit = parseInt(req.query.limit);
			if (limit) {
				q.limit(limit);
				result.limit = limit;
				var page_count = Math.ceil(count / limit);
				result.page_count = page_count;
				var page = parseInt(req.query.page);
				page = (page) ? page : 1;
				result.page = page;
				if (page < page_count) {
					result.next = changeUrlParams(req, "page", (page + 1));
				}
				if (page > 1) {
					result.prev = changeUrlParams(req, "page", (page - 1));
					q.skip(limit * (page - 1));
				}
			}
			if (req.query.sort) {
				q.sort(req.query.sort);
				result.sort = req.query.sort;
			}
			if (req.query.populate) {
				q.populate(req.query.populate);
				result.populate = req.query.populate;
			}
			if (req.query.autopopulate) {
				for(var key in Model.schema.paths) {
					var path = Model.schema.paths[key];
					if ((path.instance == "ObjectID") && (path.options.ref)) {
						q.populate(path.path);
					}
				}
				result.autopopulate = true;
			}
			q.exec(function(err, items) {
				if (err) {
					res.status(500).send(err);
				} else {
					result.data = items;
					res.json(result);
				}
			});
		});
	});

router.route('/:modelname/_describe')
	.get(auth, function(req, res) {
		console.log(Model.schema.paths);
		res.json(Model.schema.paths);
	});

router.route('/:modelname/_test')
	.get(auth, function(req, res) {
		console.log(Model);
		res.send(Model.schema.get("test"));
	});

router.route('/:modelname/:item_id')
	.get(auth, function(req, res) {
		var q = Model.findById(req.params.item_id);
		if (req.query.populate) {
			q.populate(req.query.populate);
		}
		if (req.query.autopopulate) {
			for(var key in Model.schema.paths) {
				var path = Model.schema.paths[key];
				if ((path.instance == "ObjectID") && (path.options.ref)) {
					q.populate(path.path);
				}
			}
		}
		q.exec(function(err, item) {
			if (err) {
				res.status(500).send(err);
				return;
			} else {
				if (!item) {
					res.status(404).send("Could not find document");
					return;
				}
				//Don't ever return passwords
				item = item.toObject();
				delete item.password;
				res.json(item);
			}
		});
	})
	.put(auth, function(req, res) {
		try {
			Model.findById(req.params.item_id, function(err, item) {
				if (err) {
					res.status(500).send(err);
				} else {
					if (item) {
						for(prop in item) {
							if (req.body[prop]) {
								item[prop] = req.body[prop];
								// console.log(prop, req.body[prop]);
							}
						}
						item.save(function(err) {
							if (err) {
								res.status(500).send(err);
							} else {
								res.json({ message: modelname + " updated ", data: item });
							}
						});
					} else {
						res.status(404).send("Document not found");
					}
				}
			});
		} catch(err) {
			res.status(500).send("An error occured:", err)
		}
	})
	.delete(auth, function(req, res) {
		Model.findById(req.params.item_id, function(err, item) {
			if (!item) {
				res.status(404).send("Could not find document");
				return;
			}
			if (err) {
				res.status(500).send(err);
				return;
			} 
			item.remove(function(err, item) {
				if (err) {
					res.status(500).send(err);
				} else {
					res.json({ message: modelname + ' deleted' });
				}
			});
		});
	});



module.exports = router;
