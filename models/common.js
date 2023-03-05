require('express-async-errors');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);

const findById = async (id, dbName) => {
  let name, designName;
  switch (dbName) {
    case 'blogs': {
      name = config.DB_NAME;
      designName = 'blog';
      break;
    }
    case 'users': {
      name = config.DB_USERS;
      designName = 'user';
      break;
    }
    default:
      throw new Error('Wrong database name');
  }

  const db = nano.use(name);
  const doc = await db.view(designName, 'by_id', { key: id });

  return doc;
};

module.exports = {
  findById,
};
