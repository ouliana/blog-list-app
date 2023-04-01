var testingRouter = require('express').Router();
var users = require('../models/users');
var blogs = require('../models/blogs');
var helper = require('../tests/helper');

// public API
module.exports = testingRouter;

// implementation

testingRouter.post('/reset', async function resetDatabases(request, response) {
  await users.clear();
  await blogs.clear();

  response.status(204).end();
});

testingRouter.post('/seed', async function seedDatabases(request, response) {
  helper.initialize();

  response.status(204).end();
});
