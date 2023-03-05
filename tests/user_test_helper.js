require('express-async-errors');

const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);

const nonExistingId = async () => {
  const user = {
    username: 'willremovethissoon',
    name: 'willremovethissoon',
    password: 'ldkjg8dslkgr',
  };

  const users = nano.use(config.DB_USERS);

  const response = await users.insert(user);
  await users.destroy(response.id, response.rev);

  return response.id;
};

const usersInDb = async () => {
  const users = nano.use(config.DB_USERS);

  const body = await users.view('user', 'by_id');

  return body.rows.map(row => row.value);
};

module.exports = {
  nonExistingId,
  usersInDb,
};
