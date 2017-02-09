process.env.NODE_ENV = 'test';

var User = require("../models/user_model");
var Location = require("../models/location_model");
var Organisation = require("../models/organisation_model");
var Apikey = require('../models/apikey_model');
var Room = require('../models/room_model');
var bcrypt = require('bcrypt');

var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();

var server = require("../bin/server");

chai.use(chaiHttp);


var empty = (model) => {
	return new Promise((resolve, reject) => {
		model.remove({}, err => {
			if (err)
				return reject(err);
			return resolve();
		});
	});
};

var post = (model, data) => {
	return new Promise((resolve, reject) => {
		var item = new model(data);
		item.save((err, result) => {
			if (err)
				return reject(err);
			// console.log(result);
			return resolve(result);
		});
	});
};

var encPassword = (password) => {
	hash = bcrypt.hashSync(password, 4);
	return hash;
};

var user_account = {
	name: "Test User",
	email: "user@freespeechpub.co.za",
	password: "test",
	urlid: "test-user"
};

var admin_account = {
	name: "Test Admin",
	email: "admin@freespeechpub.co.za",
	password: "test",
	admin: true,
	urlid: "test-admin"
};

var init = () => {
	var location = null;
	var organisation = null;
	return empty(User)
	.then(() => {
		return empty(Location);
	})
	.then(() => {
		return empty(Organisation);
	})
	.then(() => {
		return empty(Apikey);
	})
	.then(() => {
		return post(Location, { name: "Test Location" });
	})
	.then((result) => {
		location = result;
		return post(Organisation, { name: "Test Organisation", location_id: location._id });
	})
	.then((result) => {
		organisation = result;
		var data = {};
		for(var i in user_account) {
			data[i] = user_account[i];
		}
		data.location_id = location._id;
		data.organisation_id = organisation._id;
		data.password = encPassword(data.password);
		return post(User, data);
	})
	.then((result) => {
		var data = {};
		for(var i in admin_account) {
			data[i] = admin_account[i];
		}
		data.location_id = location._id;
		data.organisation_id = organisation._id;
		data.password = encPassword(data.password);
		return post(User, data);
	})
	.then((result) => {
		return post(Room, { name: "Test Room", location_id: location._id, cost: 1, off_peak_cost: 0.5 });
	})
	;
};

describe('Init', () => {
	beforeEach(() => {
		return init();
	});

	describe("/GET user", () => {
		it("it should GET all the users", (done) => {
			console.log(user_account);
			chai.request(server)
			.get("/api/user")
			.auth(user_account.email, user_account.password)
			.end((err, res) => {
				console.log(res.error);
				res.should.have.status(200);
				res.body.data.should.be.a('array');
				res.body.data.length.should.be.eql(2);
				done();
			});
		});
	});
});

module.exports = {
	init,
	user_account,
	admin_account
};