const config = require('./utils/config');
const logger = require('./utils/logger');
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.listen(config.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
