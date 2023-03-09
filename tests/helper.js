require('express-async-errors');
const config = require('../utils/config');
const bcrypt = require('bcrypt');
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

const initialUsers = [
  {
    username: 'root',
    name: 'Superuser',
    password: '888000888',
  },
  {
    username: 'michaelchan',
    name: 'Michael Chan',
    password: '2023lsdkgjs',
  },
  {
    username: 'edsgerdijkstra',
    name: 'Edsger W. Dijkstra',
    password: 'sdg298lkjgs',
  },
  {
    username: 'robertmartin',
    name: 'Robert C. Martin',
    password: 'oietw20jhb3fdskufs',
  },
];

const blogDesignDoc = {
  _id: '_design/blog',
  views: {
    by_id: {
      map: 'function(doc){ emit(doc._id, {url: doc.url, title: doc.title, author:doc.author, date: doc.date, user: doc.user, likes: doc.likes, id: doc._id, rev: doc._rev})}',
    },
    by_date: {
      map: 'function(doc){ emit(doc.date, {url: doc.url, title: doc.title, author:doc.author, date: doc.date, user: doc.user, likes: doc.likes, id: doc._id, rev: doc._rev})}',
    },
    by_author: {
      map: 'function(doc){ emit(doc.author, {url: doc.url, title: doc.title, author:doc.author, date: doc.date, user: doc.user, likes: doc.likes, id: doc._id})}',
    },
  },
  updates: {
    inplace:
      'function(doc, req) { var body=JSON.parse(req.body); var field = body.field; var value = body.value; doc[field] = value; return [doc, JSON.stringify(doc)]}',
  },
};

const userDesignDoc = {
  _id: '_design/user',
  views: {
    by_id: {
      map: 'function(doc){ emit(doc._id, {blogs: doc.blogs, username: doc.username, name: doc.name, id: doc._id, rev: doc._rev})}',
    },
    by_username: {
      map: 'function(doc){ emit(doc.username, {blogs: doc.blogs, username: doc.username, name: doc.name, id: doc._id, rev: doc._rev})}',
    },
    by_name: {
      map: 'function(doc){ emit(doc.name,  doc._id)}',
    },
    idbyusername: {
      map: 'function(doc){ emit(doc.username, doc._id)}',
    },
    user_info: {
      map: 'function(doc){ emit(doc.username, {id: doc._id, username: doc.username, name: doc.name, passwordHash: doc.passwordHash})}',
    },
  },
  updates: {
    inplace:
      'function(doc, req) { var body=JSON.parse(req.body); var field = body.field; var value = body.value; doc[field] = value; return [doc, JSON.stringify(doc)]}',
  },
};

const clear = async (dbName, designDocId) => {
  const db = nano.use(dbName);

  const doclist = await db.list();
  const onlyDocs = doclist.rows.filter(doc => doc.id !== designDocId);

  const promises = onlyDocs.map(doc => db.destroy(doc.id, doc.value.rev));

  await Promise.all(promises);
};

const getHashes = async () => {
  const hashed = initialUsers.map(user => bcrypt.hash(user.password, 10));

  const result = await Promise.all(hashed);
  return result;
};

const findUserBlogs = async () => {
  const blogs = nano.use(config.DB_NAME);

  const usersBlogs = await Promise.all(
    initialUsers.map(
      async user =>
        await blogs.view('blog', 'by_author', {
          key: user.name,
        })
    )
  );

  return usersBlogs.map(blog => blog.rows.map(r => r.value.id));
};

const saveUsers = async () => {
  const users = nano.use(config.DB_USERS);

  const hashes = await getHashes();
  const userBlogs = await findUserBlogs();

  const usersToPopulate = initialUsers.map((user, index) => ({
    blogs: userBlogs[index],
    username: user.username,
    name: user.name,
    passwordHash: hashes[index],
  }));

  const response = await users.bulk({ docs: usersToPopulate });

  return response;
};

const findCreators = async () => {
  const users = nano.use(config.DB_USERS);

  const creators = await Promise.all(
    initialBlogs.map(
      async blog => await users.view('user', 'by_name', { key: blog.author })
    )
  );

  return creators.map(c => c.rows[0].value);
};

const saveBlogs = async () => {
  const blogs = nano.use(config.DB_NAME);

  const response = await blogs.bulk({ docs: initialBlogs });
  return response;
};

const populateBlogs = async () => {
  const blogs = nano.use(config.DB_NAME);

  const creators = await findCreators();

  const doclist = await blogs.list({ include_docs: true });
  const onlyDocs = doclist.rows.filter(doc => doc.id !== '_design/blog');

  const blogsToPopulate = onlyDocs.map((entry, index) => ({
    ...entry.doc,
    user: creators[index],
  }));

  const response = await blogs.bulk({ docs: blogsToPopulate });
  return response;
};

const createDb = async dbName => {
  await nano.db.create(dbName);

  let designDocBody, designDocId;

  switch (dbName) {
    case config.DB_NAME:
      designDocBody = blogDesignDoc;
      designDocId = '_design/blog';
      break;
    case config.DB_USERS:
      designDocBody = userDesignDoc;
      designDocId = '_design/user';
      break;
    default:
      throw new Error('invalid database name');
  }

  const db = nano.use(dbName);
  await db.insert(designDocBody, designDocId);
};

const initialize = async () => {
  const list = await nano.db.list();
  if (!list.includes(config.DB_USERS)) {
    await createDb(config.DB_USERS);
  }
  if (!list.includes(config.DB_NAME)) {
    await createDb(config.DB_NAME);
  }
  await clear(config.DB_USERS, '_design/user');
  await clear(config.DB_NAME, '_design/blog');

  await saveBlogs();
  await saveUsers();
  await populateBlogs();
};

module.exports = {
  initialBlogs,
  initialUsers,
  initialize,
};
