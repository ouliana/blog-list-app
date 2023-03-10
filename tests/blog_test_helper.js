require('express-async-errors');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);

const canonic = 'Write component tests in 3 simple steps';

const newBlog = {
  title: 'Write component tests in 3 simple steps',
  author: 'Michael Chan',
  url: 'https://medium.com/storybookjs/write-component-tests-in-3-simple-steps-bcb2975bda36',
  date: '2023-03-09T16:38:06.705Z',
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
  const blogs = nano.use(config.DB_NAME);

  const body = await blogs.view('blog', 'by_date');

  return body.rows.map(row => row.value);
};

const blogById = async id => {
  const blogs = nano.use(config.DB_NAME);

  const body = await blogs.view('blog', 'by_id', { key: id });

  return body.rows[0].value;
};

const blogToCompare = async id => {
  const blogs = nano.use(config.DB_NAME);

  const response = await blogs.view('blog', 'by_id', { key: id });
  const blog = response.rows[0].value;
  delete blog.id;
  delete blog.rev;
  delete blog.user;

  return blog;
};

const userIdByName = async name => {
  const db = nano.use(config.DB_USERS);
  const doc = await db.view('user', 'user_for_test_api', {
    key: name,
  });

  return doc.rows[0].value;
};

const addBlogToDelete = async () => {
  const dbBlogs = nano.use(config.DB_NAME);
  const dbUsers = nano.use(config.DB_USERS);

  const insertedBlog = await dbBlogs.insert(newBlog);

  const user = await userIdByName(testName);

  console.log('user in addBlogToDelete: ', user);
  const blogsToUpdate = user.blogs.concat(insertedBlog.id);

  await dbUsers.atomic('user', 'inplace', user.id, {
    field: 'blogs',
    value: blogsToUpdate,
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
  blogById,
  blogToCompare,
  addBlogToDelete,
};
