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
"w"  | write
"r"  | read
"rw" | read/write
"wr" | Also read/write, in case of dyslexia

*/

var express = require('express');
var passport = require('passport')
var BasicStrategy = require('passport-http').BasicStrategy;
var LocalApiKeyStrategy = require('passport-localapikey').Strategy;
// var auth = require('./auth');
var User = require('../models/user_model');
var bcrypt = require('bcrypt');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var config = require('../../config');

var modelname = "";
var Model = false;

var deny = function(req, res, next) {
	console.log("Denying auth");
	res.status(500).send("Unauthorized");
	req.authorized = false;
}

/* This middleware prepares the correct Model */
router.use('/:modelname', function(req, res, next) {
	modelname = req.params.modelname;
	Model = require('../models/' + modelname + "_model");
	next();
});

/* Deal with Passwords. Just always encrypt anything called 'password' */
router.use('/:modelname', function(req, res, next) {

	function encPassword(password) {
		
		return hash = bcrypt.hashSync(password, 4);
	}

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
	} else {
		var method = "w";
	}
	req.authorized = false;
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
		User.findOne({ apikey: apikey }, function(err, user) {
			if (err) { 
				console.log("Err", err);
				deny(req, res, next);
				return;
			}
			if (!user) {
				console.log("Deny User");
				deny(req, res, next);
				return;
			}
			req.user = user;
			//Let's check perms in this order - admin, user, owner
			//Admin check
			if (user.admin) { 
				if (perms["admin"].indexOf(method) !== -1) {
					console.log("Matched permission 'admin':", method);
					req.authorized = true;
					next();
					return;
				}
			}
			//User check
			if (perms["user"].indexOf(method) !== -1) {
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
				if ((item) && (item._owner_id) && (item._owner_id.toString() == user._id.toString())) {
					req.authorized = true;
					console.log("Matched permission 'owner'", method);
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
	} else {
		console.log("No API key");
		deny(req, res, next);
		return;
	}
};

/* Routes */
router.route('/:modelname')
	.post(auth, function(req, res) {
		var item = new Model();
		for(prop in item) {
			if (req.body[prop]) {
				item[prop] = req.body[prop];
			}
		}
		// item.add("_owner_id");
		item._owner_id = req.user._id;
		console.log(item);
		item.save(function(err) {
			if (err) {
				res.send(err);
			} else {
				res.json({ message: modelname + " created ", data: item });
			}
		});
	})
	.get(auth, function(req, res) {
		Model.find(req.query.filter, function(err, items) {
			if (err) {
				res.send(err);
			} else {
				res.json(items);
			}
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
		Model.findById(req.params.item_id, function(err, item) {
			if (err) {
				res.send(err);
			} else {
				res.json(item);
			}
		});
	})
	.put(auth, function(req, res) {
		Model.findById(req.params.item_id, function(err, item) {
			if (err) {
				res.send(err);
			} else {
				for(prop in item) {
					if (req.body[prop]) {
						item[prop] = req.body[prop];
					}
				}
				item.save(function(err) {
					if (err) {
						res.send(err);
					} else {
						res.json({ message: modelname + " updated ", data: item });
					}
				});
			}
		});	
	})
	.delete(auth, function(req, res) {
		Model.remove({
			_id: req.params.item_id
		}, function(err, item) {
			if (err) {
				res.send(err);
			} else {
				res.json({ message: modelname + ' deleted' });
			}
		});
	});



module.exports = router;
