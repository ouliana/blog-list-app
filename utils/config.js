require('dotenv').config();

const PORT = process.env.PORT;
const COUCHDB_URI = process.env.COUCHDB_URI;

const DB_NAME = process.env.NODE_ENV === 'test' ? 'test' : 'blogs';

module.exports = {
  PORT,
  COUCHDB_URI,
  DB_NAME,
};
