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

blogsRouter.delete('/:id', async (req, res) => {
  await blogs.destroy(req.params.id);
  res.status(204).end();
});

blogsRouter.post('/', async (request, res) => {
  const body = request.body;

  const username = 'michaelchan';
  const user = await users.findUser(username);

  const blog = {
    ...body,
    date: body.date ? body.date : new Date(),
    likes: body.likes ? body.likes : 0,
    user: user.id,
  };

  const createdBlog = await blogs.save(blog);

  res.status(201).send(createdBlog);
});

blogsRouter.put('/:id', async (request, response) => {
  const updatedBlog = await blogs.update(request);

  response.send(updatedBlog);
});

module.exports = blogsRouter;
