const express = require('express');
const app = express();
const cors = require('cors');
const blogsRoute = require('./controllers/blogs');

app.use(cors());
app.use(express.static('build'));
app.use(express.json());

app.use('/api/blogs', blogsRoute);

module.exports = app;
