require('express-async-errors');
const blogs = require('../models/blogs');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);

const canonic = 'Write component tests in 3 simple steps';

const newBlog = {
  title: 'Write component tests in 3 simple steps',
  author: 'Michael Chan',
  url: 'https://medium.com/storybookjs/write-component-tests-in-3-simple-steps-bcb2975bda36',
  // date: '2023-03-09T16:38:06.705Z',
  likes: 0,
};

const testName = 'Michael Chan';

const nonExistingLikes = {
  title: 'Write component tests in 3 simple steps',
  author: 'Michael Chan',
  url: 'https://medium.com/storybookjs/write-component-tests-in-3-simple-steps-bcb2975bda36',
  date: '2023-03-09T16:38:06.705Z',
};

const missingTitle = {
  author: 'Michael Chan',
  url: 'https://medium.com/storybookjs/write-component-tests-in-3-simple-steps-bcb2975bda36',
  date: '2023-03-09T16:38:06.705Z',
};

const missingAuthor = {
  title: 'Write component tests in 3 simple steps',
  url: 'https://medium.com/storybookjs/write-component-tests-in-3-simple-steps-bcb2975bda36',
  date: '2023-03-09T16:38:06.705Z',
};

const nonExistingId = async () => {
  const blog = {
    title: 'willremovethissoon',
    author: 'willremovethissoon',
    url: 'http://nonexistent.net',
    likes: 0,
    date: new Date(),
  };

  const blogs = nano.use(config.DB_NAME);

  const response = await blogs.insert(blog);
  await blogs.destroy(response.id, response.rev);

  return response.id;
};

const blogsInDb = async () => {
  const dbBlogs = nano.use(config.DB_NAME);
  const data = await dbBlogs.view('blog', 'by_id');

  return data.rows.map(row => row.value);
};

const blogToCompare = async id => {
  const dbBlogs = nano.use(config.DB_NAME);
  const data = await dbBlogs.view('blog', 'for_test_to_compare', { key: id });
  const blog = data.rows[0].value;
  delete blog.date;
  return blog;
};

const blogById = async id => {
  const dbBlogs = nano.use(config.DB_NAME);
  const data = await dbBlogs.view('blog', 'by_id', { key: id });

  return data.rows[0].value;
};

const addBlogToDelete = async () => {
  const insertedBlog = await blogs.save(newBlog);

  const dbUsers = nano.use(config.DB_USERS);
  const data = await dbUsers.view('user', 'for_test_api', { key: testName });
  const user = data.rows[0].value;

  const updatedUserBlogs = user.blogs.concat(insertedBlog.id);

  await dbUsers.atomic('user', 'inplace', user.id, {
    field: 'blogs',
    value: updatedUserBlogs,
  });

  return insertedBlog.id;
};

module.exports = {
  missingTitle,
  missingAuthor,
  canonic,
  newBlog,
  nonExistingLikes,
  nonExistingId,
  blogsInDb,
  addBlogToDelete,
  blogToCompare,
  blogById,
};
