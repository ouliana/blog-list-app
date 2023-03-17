require('express-async-errors');
const jwt = require('jsonwebtoken');
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
      map: 'function(doc){ emit(doc._id, {url: doc.url, title: doc.title, author:doc.author, date: doc.date, user: doc.user, likes: doc.likes, id: doc._id})}',
    },
    by_date: {
      map: 'function(doc){ emit(doc.date, {url: doc.url, title: doc.title, author:doc.author, date: doc.date, user: doc.user, likes: doc.likes, id: doc._id})}',
    },
    to_show: {
      map: 'function(doc){ emit(doc._id, {url: doc.url, title: doc.title, author:doc.author, date: doc.date, user: doc.user, likes: doc.likes, id: doc._id})}',
    },
    ids_for_user: {
      map: 'function(doc){ emit(doc.user, doc._id)}',
    },
    for_user: {
      map: 'function(doc){ emit(doc._id, {url: doc.url, title: doc.title, author:doc.author, date: doc.date, likes: doc.likes})}',
    },
    by_author: {
      map: 'function(doc){ emit(doc.author, doc._id)}',
    },
    for_test_to_compare: {
      map: 'function(doc){ emit(doc._id, {url: doc.url, title: doc.title, author:doc.author, date: doc.date, likes: doc.likes})}',
    },
  },
  updates: {
    inplace:
      'function(doc, req) { var body=JSON.parse(req.body); var field = body.field; var value = body.value; doc[field] = value; return [doc, JSON.stringify(doc)]}',
  },
};

const userDesignDoc = {
  _id: '_design/user',
  _rev: '2-445ecf36fb4cf33aafbc9476e810c23a',
  views: {
    by_id: {
      map: 'function(doc){ emit(doc._id, {blogs: doc.blogs, username: doc.username, name: doc.name, id: doc._id, rev: doc._rev})}',
    },
    by_username: {
      map: 'function(doc){ emit(doc.username, {blogs: doc.blogs, username: doc.username, name: doc.name, id: doc._id, rev: doc._rev})}',
    },
    id_by_name: {
      map: 'function(doc){ emit(doc.name,  doc._id)}',
    },
    id_by_username: {
      map: 'function(doc){ emit(doc.username, doc._id)}',
    },
    for_auth: {
      map: 'function(doc){ emit(doc.username, {username: doc.username, name: doc.name, passwordHash: doc.passwordHash, id: doc._id})}',
    },
    full_info: {
      map: 'function(doc){ emit(doc._id, {id: doc._id, username: doc.username, name: doc.name, passwordHash: doc.passwordHash})}',
    },
    for_blog: {
      map: 'function(doc){ emit(doc._id, {username: doc.username, name: doc.name, id: doc._id})}',
    },
    for_api: {
      map: 'function(doc){ emit(doc._id, doc.blogs)}',
    },
    for_test_api: {
      map: 'function(doc){ emit(doc.name, {blogs: doc.blogs, id: doc._id})}',
    },
    to_show: {
      map: 'function(doc){ emit(doc._id, {notes: doc.blogs, username: doc.username, name: doc.name, id: doc._id})}',
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

const saveUsers = async () => {
  const dbUsers = nano.use(config.DB_USERS);

  const hashes = await getHashes();

  const usersToPopulate = initialUsers.map((user, index) => ({
    blogs: [],
    username: user.username,
    name: user.name,
    passwordHash: hashes[index],
  }));

  const response = await dbUsers.bulk({ docs: usersToPopulate });

  return response;
};

const saveBlogs = async () => {
  const dbBlogs = nano.use(config.DB_NAME);
  const dbUsers = nano.use(config.DB_USERS);

  const promises = initialBlogs.map(async blog => {
    const data = await dbUsers.view('user', 'id_by_name', { key: blog.author });
    const userId = data.rows[0].value;

    const blogToInsert = {
      ...blog,
      user: userId,
    };
    await dbBlogs.insert(blogToInsert);
  });

  await Promise.all(promises);
};

const setBlogsToUsers = async () => {
  const dbBlogs = nano.use(config.DB_NAME);
  const dbUsers = nano.use(config.DB_USERS);

  const data = await dbUsers.view('user', 'for_test_api');
  const users = data.rows.map(row => row.value);

  const promises = users.map(async user => {
    const data = await dbBlogs.view('blog', 'ids_for_user', {
      key: user.id,
    });

    const userBlogs = data.rows.map(row => row.value);

    const response = await dbUsers.atomic('user', 'inplace', user.id, {
      field: 'blogs',
      value: userBlogs,
    });

    return response;
  });

  const response = await Promise.all(promises);
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

  await saveUsers();
  await saveBlogs();
  await setBlogsToUsers();

  const passwordHash = await bcrypt.hash('sekret', 10);
  const user = { notes: [], username: 'root', passwordHash };
  const db = nano.use(config.DB_USERS);
  await db.insert(user);
};

const getToken = async () => {
  const users = nano.use(config.DB_USERS);
  const username = 'michaelchan';

  const response = await users.view('user', 'for_token', {
    key: username,
  });

  const userForToken = {
    username: response.rows[0].value.username,
    id: response.rows[0].value.id,
  };

  return jwt.sign(userForToken, process.env.SECRET);
};

module.exports = {
  initialBlogs,
  initialUsers,
  initialize,
  getToken,
};
