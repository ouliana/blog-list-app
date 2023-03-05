const bcrypt = require('bcrypt');
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

  const validation = users.validate(user);
  if (validation.error) {
    console.log('validation.error: ', validation.error);
    throw new Error(validation.error);
  }

  const saltRounds = 10;
  user.passwordHash = await bcrypt.hash(request.body.password, saltRounds);

  delete user.password;

  const savedUser = await users.save(user);
  response.status(201).json(savedUser);
});

module.exports = usersRouter;
