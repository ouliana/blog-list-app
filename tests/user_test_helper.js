require('express-async-errors');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);

const nonExistingId = async () => {
  const user = {
    username: 'willremovethissoon',
    name: 'willremovethissoon',
    password: 'ldkjg8dslkgr',
  };

  const dbUsers = nano.use(config.DB_USERS);

  const response = await dbUsers.insert(user);
  await dbUsers.destroy(response.id, response.rev);

  return response.id;
};

const usersInDb = async () => {
  const users = nano.use(config.DB_USERS);

  const data = await users.view('user', 'to_show');

  return data.rows.map(row => row.value);
};

module.exports = {
  nonExistingId,
  usersInDb,
};
