const blogsRouter = require('express').Router();
const blogs = require('../models/blogs');
const users = require('../models/users');
const common = require('../models/common');

blogsRouter.get('/', async (req, res) => {
  const entries = await blogs.find(req, res);
  res.status(200).send(entries);
});

blogsRouter.get('/:id', async (req, res) => {
  const entry = await common.findById(req.params.id, 'blogs');
  if (entry) {
    res.send(entry);
  } else {
    res.status(404).end();
  }
});

blogsRouter.delete('/:id', async (request, response) => {
  await blogs.destroy(request.params.id);

  const user = await common.findById(request.user.id, 'users');
  const blogsToUpdate = user.blogs.filter(
    blog => blog.id !== request.params.id
  );

  await users.updateBlogs(user.id, blogsToUpdate);

  response.status(204).end();
});

blogsRouter.post('/', async (request, response) => {
  const body = request.body;

  const user = await common.findById(request.user.id, 'users');
  const blog = {
    ...body,
    date: body.date ?? new Date(),
    likes: body.likes ?? 0,
    user: user.id,
  };

  const createdBlog = await blogs.save(blog);
  const blogsToUpdate = user.blogs.concat(createdBlog.id);

  await users.updateBlogs(user.id, blogsToUpdate);

  response.status(201).json(createdBlog);
});

blogsRouter.put('/:id', async (request, response) => {
  const updatedBlog = await blogs.update(request);

  response.send(updatedBlog);
});

module.exports = blogsRouter;
