var blogsRouter = require('express').Router();
var middleware = require('../utils/middleware');
var blogs = require('../models/blogs');
var users = require('../models/users');

// public API
module.exports = blogsRouter;

// implementation
blogsRouter.get('/', async (request, response) => {
  var data = await blogs.find();
  response.status(200).send(data);
});

blogsRouter.get('/:id', async (request, response) => {
  var data = await blogs.findOne(request.params.id, 'by_id');
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
  async function deleteBlog(request, response) {
    await blogs.destroy(request.params.id);

    await users.updateBlogs(request.user.id, request.params.id, 'delete');

    response.status(204).end();
  }
);

blogsRouter.post(
  '/',
  middleware.tokenExtractor,
  middleware.userExtractor,
  async function saveBlog(request, response) {
    console.log('user: ', request.user);
    var blog = {
      ...request.body,
      date: new Date(),
      user: request.user.id,
    };
    if (!Object.hasOwn(request.body, 'likes')) {
      blog.likes = 0;
    }

    var savedBlog = await blogs.save(blog);
    await users.updateBlogs(request.user.id, savedBlog.id, 'insert');

    response.status(201).json(savedBlog);
  }
);

blogsRouter.put(
  '/:id',
  middleware.tokenExtractor,
  middleware.userExtractor,
  async function updateBlog(request, response) {
    var id = request.params.id;
    var body = request.body;
    var updatedBlog = await blogs.update(id, body);

    response.status(200).json(updatedBlog);
  }
);
