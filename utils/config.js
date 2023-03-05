require('dotenv').config();

const PORT = process.env.PORT;
const COUCHDB_URI = process.env.COUCHDB_URI;

const DB_NAME = process.env.NODE_ENV === 'test' ? 'test_b' : 'blogs';
const DB_USERS = process.env.NODE_ENV === 'test' ? 'test_u' : 'users';

module.exports = {
  PORT,
  COUCHDB_URI,
  DB_NAME,
  DB_USERS,
};
