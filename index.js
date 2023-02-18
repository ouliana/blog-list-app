require('dotenv').config();
const http = require('http');
const express = require('express');
const app = express();
const cors = require('cors');

const Joi = require('./models/joi');
const BlogList = require('./models/couchdb');

app.use(cors());
app.use(express.json());

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

app.get('/api/blogs/', async (req, res, next) => {
  try {
    const entries = await BlogList.getAll(req, res, next);

    res.send(
      entries.map(entry => ({
        title: entry.doc.title,
        author: entry.doc.author,
        url: entry.doc.url,
        likes: entry.doc.likes,
        id: entry.id,
      }))
    );
  } catch (err) {
    next(err);
  }
});

app.post('/api/blogs/', async (req, res, next) => {
  try {
    await Joi.validate(req.body);
    const createdBlog = await BlogList.create(req.body);
    res.send(createdBlog);
  } catch (error) {
    next(error);
  }
});
