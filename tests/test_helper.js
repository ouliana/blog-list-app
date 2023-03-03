require('express-async-errors');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);

const initialBlogs = [
  {
    title: 'React patterns',
    author: 'Michael Chan',
    url: 'https://reactpatterns.com/',
    likes: 7,
    date: '2009/01/15 15:52:20',
  },
  {
    title: 'Go To Statement Considered Harmful',
    author: 'Edsger W. Dijkstra',
    url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html',
    likes: 5,
    date: '2010/01/15 15:52:20',
  },
  {
    title: 'Canonical string reduction',
    author: 'Edsger W. Dijkstra',
    url: 'http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html',
    likes: 12,
    date: '2011/01/15 15:52:20',
  },
  {
    title: 'First class tests',
    author: 'Robert C. Martin',
    url: 'http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.htmll',
    likes: 10,
    date: '2009/04/15 15:52:20',
  },
  {
    title: 'TDD harms architecture',
    author: 'Robert C. Martin',
    url: 'http://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html',
    likes: 0,
    date: '2009/01/16 15:52:20',
  },
  {
    title: 'Type wars',
    author: 'Robert C. Martin',
    url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
    likes: 2,
    date: '2023/01/15 15:52:20',
  },
];

const canonic = 'Design for mankind';

const newBlog = {
  title: canonic,
  author: 'Erin Loechner',
  url: 'https://designformankind.com/blog/',
  likes: 9300,
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

const designDoc = {
  _id: '_design/blog',
  views: {
    bydate: {
      map: 'function(doc){ emit(doc._id, doc.date)}',
    },
  },
  updates: {
    inplace:
      'function(doc, req) { var body=JSON.parse(req.body); var field = body.field; var value = body.value; doc[field] = value; return [doc, JSON.stringify(doc)]}',
  },
};

const initialize = async () => {
  const list = await nano.db.list();
  let blogs;
  if (!list.includes(config.DB_NAME)) {
    await nano.db.create(config.DB_NAME);
    blogs = nano.use(config.DB_NAME);
    await blogs.insert(designDoc, '_design/blog');
  } else {
    blogs = nano.use(config.DB_NAME);

    const doclist = await blogs.list();
    const onlyBlogs = doclist.rows.filter(doc => doc.id !== '_design/blog');
    const promises = onlyBlogs.map(doc => blogs.destroy(doc.id, doc.value.rev));

    await Promise.all(promises);
  }
  const response = await blogs.bulk({ docs: initialBlogs });
  return response;
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

  const body = await blogs.view('blog', 'bydate', { include_docs: true });
  const response = body.rows.map(entry => {
    const doc = entry.doc;
    ({ _id: doc.id, _rev: doc.rev } = doc);
    delete doc._id;
    delete doc._rev;
    return doc;
  });
  return response;
};

const blogToCompare = async id => {
  const blogs = nano.use(config.DB_NAME);

  const blog = await blogs.get(id);
  delete blog._id;
  delete blog._rev;

  return blog;
};

const blogById = async id => {
  const blogs = nano.use(config.DB_NAME);
  console.log('id: ', id);
  const blog = await blogs.get(id);

  ({ _id: blog.id, _rev: blog.rev } = blog);
  delete blog._id;
  delete blog._rev;

  return blog;
};

module.exports = {
  initialBlogs,
  missingTitle,
  missingAuthor,
  canonic,
  newBlog,
  nonExistingLikes,
  initialize,
  nonExistingId,
  blogsInDb,
  blogById,
  blogToCompare,
};
