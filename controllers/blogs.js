const blogsRouter = require('express').Router();
const middleware = require('../utils/middleware');
const blogs = require('../models/blogs');
const users = require('../models/users');

blogsRouter.get('/', async (request, response) => {
  const data = await blogs.find();
  response.status(200).send(data);
});

blogsRouter.get('/:id', async (request, response) => {
  const data = await blogs.findOne(request.params.id, 'to_show');
  if (data) {
    response.send(data);
  } else {
    response.status(404).end();
  }
});

blogsRouter.delete(
  '/:id',
  middleware.tokenExtractor,
  middleware.userExtractor,
  async (request, response) => {
    await blogs.destroy(request.params.id);

    await users.updateBlogs(request.user.id, request.params.id, 'delete');

    response.status(204).end();
  }
);

blogsRouter.post(
  '/',
  middleware.tokenExtractor,
  middleware.userExtractor,
  async (request, response) => {
    const blog = {
      ...request.body,
      date: new Date(),
      likes: 0,
      user: request.user.id,
    };

    const savedBlog = await blogs.save(blog);
    await users.updateBlogs(request.user.id, savedBlog.id, 'insert');

    response.status(201).json(savedBlog);
  }
);

blogsRouter.put(
  '/:id',
  middleware.tokenExtractor,
  middleware.userExtractor,
  async (request, response) => {
    const updatedBlog = await blogs.update(request);

    response.status(200).json(updatedBlog);
  }
);

module.exports = blogsRouter;
