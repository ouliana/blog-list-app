const Joi = require('../models/joi');
const blogs = require('../models/couchdb');

const blogsRoute = require('express').Router();

blogsRoute.get('/', async (req, res) => {
  const entries = await blogs.getAll(req, res);
  res.status(200).send(entries);
});

blogsRoute.post('/', async (req, res) => {
  const { body: blog } = req;
  if (!Object.hasOwn(blog, 'likes')) blog.likes = 0;
  await Joi.validate(blog);

  const createdBlog = await blogs.create(blog);
  res.status(201).send(createdBlog);
});

blogsRoute.put('/:id', async (req, res) => {
  const { body: blog } = req;
  if (!Object.hasOwn(blog, 'likes')) blog.likes = 0;
  await Joi.validate(blog);

  const updatedBlog = await blogs.update(req.params.id, 'likes', blog.likes);
  res.status(200).send(updatedBlog);
});

blogsRoute.delete('/:id', async (req, res) => {
  await blogs.destroy(req.params.id);
  res.status(204).end();
});

module.exports = blogsRoute;
