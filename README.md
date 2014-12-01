# Jexpress

## An opinionated API that works just by writing models

Life's too short to make APIs. With Jexpress, you write your model and then, er, no that's it. You just write the model. Jexpress takes care of the rest.

What Jexpress gives you is permission management (down to an object level), user management (even a password recovery thingymagig), password encryption (this is the "opinionated" bit), and of course a full RESTful API with CRUD and hardly any programming. 

### Installing

```
git clone git@github.com:j-norwood-young/jexpress.git
npm install
npm start
```

Now point your browser at [http://localhost:3001] and you should see the Jexpress welcome screen.

### Bootstrapping

We need an initial user account so that you can authenticate on the API. To bootstrap the server, visit the page http://localhost:3001/bootstrap/, or run the following command:

```
curl -X GET http://localhost:3001/bootstrap/
```

You should see the following message:
```
{
message: "users table created "
}
```

You now have a user with username `admin`, and password `admin`. You should probably change that. Let's see how (which will conveniently demonstrate how to use the various features of Jexpress in the process):

#### Logging In

To log in, we send a username and a password as a POST to /login/, and we get an API key back. We can then use this API key to transact with the API. The API key expires after a while - you can change how long this is in the config.js file.

```
curl -X POST -d "email=admin&password=admin" http://localhost:3001/api/login/
```

Response:
```
{"__v":0,"apikey":"zLVeDDHXWYy5C6sX","user_id":"547c81242d18033004e2eaf5","_id":"547c82342d18033004e2eaf6","created":"2014-12-01T14:59:00.935Z"}
```

We're interested in the `apikey`, which in this case is `zLVeDDHXWYy5C6sX`. 

Now we can see all the users in our system:

```
curl -X GET http://localhost:3001/api/user/\?apikey\=zLVeDDHXWYy5C6sX
```

Response:

```
[{"_id":"547c81242d18033004e2eaf5","password":"$2a$04$gIW6I8nLouIuX.135WFgFeFNREdyixYS.5D5.3G1gHN2FvRohertS","admin":true,"email":"admin","name":"Admin","__v":0}]
```

This is a list of users (even if there's only one user in there at the moment). What if we just want to see one?

```
curl -X GET http://localhost:3001/api/user/547c81242d18033004e2eaf5/\?apikey\=zLVeDDHXWYy5C6sX
```

Response: 
```
{"_id":"547c81242d18033004e2eaf5","admin":true,"email":"admin","name":"Admin","__v":0}
```

Let's change our password. To change an existing object, we send a PUT command.

```
curl -X PUT -d "password=newpassord" http://localhost:3001/api/user/547c81242d18033004e2eaf5/\?apikey\=zLVeDDHXWYy5C6sX
```

Response:
```
{"message":"user updated ","data":{"_id":"547c81242d18033004e2eaf5","password":"$2a$04$B3dQkzOFiDc59QLkHo89iutc4iT9bYohBK18aqcylvc4CSJsGlCg.","admin":true,"email":"admin","name":"Admin","__v":0}}
```

Erm, that wasn't the password I set. What happened there? Jexpress hashes all fields called "password". If you want your password field to be clear-text, well, tough luck.

Finally, let's create a new user, who isn't an admin. To add an object, we use the POST command:

```
curl -X POST -d "email=jason@10layer.com&password=password&admin=false" http://localhost:3001/api/user/\?apikey\=zLVeDDHXWYy5C6sX
```

Response:
```
{"message":"user created ","data":{"__v":0,"_owner_id":"547c81242d18033004e2eaf5","email":"jason@10layer.com","password":"$2a$04$Lk5diezgm0EcsqVu6DsBDOz4Xz6JejNTtlxdKI/u4YB/Uq9UrQbJG","admin":false,"_id":"547c84c62d18033004e2eaf7"}}
```

Now when we list all users, we should see both.

```
curl -X GET http://localhost:3001/api/user/\?apikey\=zLVeDDHXWYy5C6sX
```

Response:
```
[{"_id":"547c81242d18033004e2eaf5","password":"$2a$04$B3dQkzOFiDc59QLkHo89iutc4iT9bYohBK18aqcylvc4CSJsGlCg.","admin":true,"email":"admin","name":"Admin","__v":0},{"_id":"547c84c62d18033004e2eaf7","_owner_id":"547c81242d18033004e2eaf5","email":"jason@10layer.com","password":"$2a$04$Lk5diezgm0EcsqVu6DsBDOz4Xz6JejNTtlxdKI/u4YB/Uq9UrQbJG","admin":false,"__v":0}]
```

Finally, let's delete that new user.

```
curl -X DELETE http://localhost:3001/api/user/547c81242d18033004e2eaf5/\?apikey\=zLVeDDHXWYy5C6sX
```

Response:
```
{"message":"user deleted"}
```

### Making Models

Jexpress is built on Express and Node.js, so you have the full power of those platforms. But mostly, you'll just want to change the models (which are really just generic Mongoose models.)

All the models are located under /app/models, and are named modelname_model.js. You can create new models, and the API will automatically use them, provided you use the correct naming convention.

The /app/models/user_model.js is a good example model to get going. It looks like this:
```
var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Objectid = mongoose.Schema.Types.ObjectId;

var UserSchema   = new Schema({
    name: String,
    email: { type: String, unique: true, index: true },
    password: String,
    admin: Boolean,
    temp_hash: String,
    _owner_id: Objectid,
});

UserSchema.set("_perms", {
    admin: "crud",
    owner: "cru",
    user: "r",
    all: "",
});

UserSchema.post("save", function(user) { 
    // This is a good place to put post-save logic
});

module.exports = mongoose.model('User', UserSchema);
```

You can feel free to add to the user model for your application, but you should keep all of the current fields (except for name, which is superfluous). 

Let's have a look at the fields.

**name**
This doesn't do anything in Jexpress. You can set it if you want.

**email**
This is the primary identifier for a user. And it's used to email password resets.

**password**
A hashed password. This is automagically hashed, you don't need to do it explicitly.

**admin**
Defines a user as an admin. We'll get into permissions a bit later.

**temp_hash**
Lets a user log in through a temporary login key, for password recovery.

**_owner_id**
This is used to associate an object to a user, which we utilise in our permissions.

###Permissions

Jexpress implements seperate permissions for administrators, object owners, users, and all.

- An administrator is a user with the "admin" field set to true.
- An owner is the creator of an object.
- A user is any logged in user using a valid API key.
- All is everybody, whether they have an API key or not. The unwashed masses.

Each type of user can have the following permissions set:
- **c** - Create an object
- **r** - Retrieve/read an object
- **u** - Update an existing object
- **d** - Delete an object

So in the above example:
- An admin can create, read, update or delete other users;
- An owner can read or update their own account ("Create" has no meaning in this context)
- A user can read other users' account details, but can't take any action on them
- Anyone who isn't logged in can't have anything to do with user accounts

***Tip:*** The line ```all: "",``` isn't necessary. If a permission isn't set, it's assumed that that user level can't do anything.

###Business Logic

You can add some logic into your API by using Mongoose's [Middleware](http://mongoosejs.com/docs/middleware.html) and its [Validation](http://mongoosejs.com/docs/validation.html). There's lots of cool stuff you can do in Mongoose that'll Just Work (tm) in Jexpress. 

###Using the API

The URL format for the API is as follows:
http://***your-server***:***port***/api/***content-type***/***id***/?apikey=***apikey***

- **your-server** would usually be localhost
- **port** is defined in config.js - default is 3001
- **content-type** is the name of your model, such as "user" for users or "test" for the test model that comes with Jexpress
- **id** is the unique ID of a specific object when you're getting a single object, updating an object or deleting an object
- **apikey** is the apikey you get when you log in

The following actions are supported:

- **GET** will get all the objects of a certain type, if no ID is set, else will retrieve one object
- **POST** creates a brand-spanking-new object - you must leave the ID off
- **PUT** updates an existing object, and requires an ID
- **DELETE** deletes an existing object, and requires an ID

###Getting Help

You can submit an [Issue in Git](https://github.com/j-norwood-young/jexpress/issues), email me at jexpress@freespeechpub.co.za, or do a pull request.
