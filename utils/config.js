require('dotenv').config();

const PORT = process.env.PORT;
const COUCHDB_URI = process.env.COUCHDB_URI;

module.exports = { PORT, COUCHDB_URI };
