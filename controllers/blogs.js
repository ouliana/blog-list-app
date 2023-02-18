const Joi = require('../models/joi');
const BlogList = require('../models/couchdb');

const blogsRoute = require('express').Router();

blogsRoute.get('/', async (req, res, next) => {
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

blogsRoute.post('/', async (req, res, next) => {
  try {
    await Joi.validate(req.body);
    const createdBlog = await BlogList.create(req.body);
    res.send(createdBlog);
  } catch (error) {
    next(error);
  }
});

module.exports = blogsRoute;
