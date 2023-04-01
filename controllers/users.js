var usersRouter = require('express').Router();
var users = require('../models/users');

//public API
module.exports = usersRouter;

usersRouter.get('/', async function getUsersFromDb(request, response) {
  var data = await users.find();
  response.send(data);
});

usersRouter.post('/', async function saveUserToDb(request, response) {
  var user = request.body;

  // check uniqueness, isUnique throws if not
  await users.isUnique(user.username);

  var savedUser = await users.save(user);
  response.status(201).json(savedUser);
});
