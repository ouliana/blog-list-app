const usersRouter = require('express').Router();
const users = require('../models/users');

usersRouter.get('/', async (request, response) => {
  console.log('usersRouter.get');
  const entries = await users.find();
  response.send(entries);
});

usersRouter.post('/', async (request, response) => {
  const user = request.body;
  user.blogs = [];
  await users.isUnique(user.username);

  const savedUser = await users.save(user);
  response.status(201).json(savedUser);
});

module.exports = usersRouter;
