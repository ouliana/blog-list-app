var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var loginRouter = require('express').Router();
var users = require('../models/users');

// public API
module.exports = loginRouter;

// implementation

loginRouter.post('/', async function saveUser(request, response) {
  console.log('login router');
  var { username, password } = request.body;

  var user = await users.findOne(username, 'details_by_username');
  var passwordCorrect =
    user === null ? false : await bcrypt.compare(password, user.passwordHash);

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid username or password',
    });
  }

  var userForToken = {
    username: user.username,
    id: user.id,
  };

  var token = jwt.sign(userForToken, process.env.SECRET);
  console.log('status: 200');

  response
    .status(200)
    .send({ token, username: user.username, name: user.name });
});
