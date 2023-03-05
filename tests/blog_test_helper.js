require('express-async-errors');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);

const canonic = 'Design for mankind';

const newBlog = {
  title: canonic,
  author: 'Erin Loechner',
  url: 'https://designformankind.com/blog/',
  likes: 50,
  date: '2023/02/15 15:52:20',
};

const nonExistingLikes = {
  title: canonic,
  author: 'Erin Loechner',
  url: 'https://designformankind.com/blog/',
  date: '2023/02/15 15:52:20',
};

const missingTitle = {
  author: 'Erin Loechner',
  url: 'https://designformankind.com/blog/',
  date: '2023/02/15 15:52:20',
};

const missingAuthor = {
  title: canonic,
  url: 'https://designformankind.com/blog/',
  date: '2023/02/15 15:52:20',
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

  console.log('blog to compare with: ', blog);

  return blog;
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
};
