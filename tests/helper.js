require('express-async-errors');
var jwt = require('jsonwebtoken');
var config = require('../utils/config');
var bcrypt = require('bcrypt');
var nano = require('nano')(config.COUCHDB_URI);

//public API

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

Object.assign(module.exports, {
  initialBlogs,
  initialUsers,
  initialize,
  getToken,
  seed,
});

// private implementation

const blogDesignDoc = {
  _id: '_design/blog',
  views: {
    by_id: {
      map: 'function(doc){ emit(doc._id, {url: doc.url, title: doc.title, author:doc.author, date: doc.date, user: doc.user, likes: doc.likes, id: doc._id})}',
    },
    by_date: {
      map: 'function(doc){ emit(doc.date, {url: doc.url, title: doc.title, author:doc.author, date: doc.date, user: doc.user, likes: doc.likes, id: doc._id})}',
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
  views: {
    by_username: {
      map: 'function(doc){ emit(doc.username, {blogs: doc.blogs, username: doc.username, name: doc.name, id: doc._id, rev: doc._rev})}',
    },
    id_by_name: {
      map: 'function(doc){ emit(doc.name,  doc._id)}',
    },
    id_by_username: {
      map: 'function(doc){ emit(doc.username, doc._id)}',
    },
    for_token: {
      map: 'function(doc){ emit(doc.username, {username: doc.username, id: doc._id})}',
    },
    details_by_id: {
      map: 'function(doc){ emit(doc._id, {id: doc._id, username: doc.username, name: doc.name, passwordHash: doc.passwordHash})}',
    },
    details_by_username: {
      map: 'function(doc){ emit(doc.username, {id: doc._id, username: doc.username, name: doc.name, passwordHash: doc.passwordHash})}',
    },
    for_blog: {
      map: 'function(doc){ emit(doc._id, {username: doc.username, name: doc.name, id: doc._id})}',
    },
    blogs_by_id: {
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

var dbBlogs = nano.use(config.DB_NAME);
var dbUsers = nano.use(config.DB_USERS);

async function clear(dbName, designDocId) {
  var db = nano.use(dbName);

  var doclist = await db.list();
  var onlyDocs = doclist.rows.filter(doc => doc.id !== designDocId);

  var promises = onlyDocs.map(doc => db.destroy(doc.id, doc.value.rev));

  await Promise.all(promises);
}

async function getHashes() {
  var hashed = initialUsers.map(user => bcrypt.hash(user.password, 10));

  var result = await Promise.all(hashed);
  return result;
}

async function saveUsers() {
  var hashes = await getHashes();

  var usersToPopulate = initialUsers.map((user, index) => ({
    blogs: [],
    username: user.username,
    name: user.name,
    passwordHash: hashes[index],
  }));

  var response = await dbUsers.bulk({ docs: usersToPopulate });

  return response;
}

async function saveBlogs() {
  var mapBlogsToInsert = async blog => {
    var data = await dbUsers.view('user', 'id_by_name', { key: blog.author });
    var userId = data.rows[0].value;

    var blogToInsert = {
      ...blog,
      user: userId,
    };
    await dbBlogs.insert(blogToInsert);
  };

  var promises = initialBlogs.map(mapBlogsToInsert);

  await Promise.all(promises);
}

async function setBlogsToUsers() {
  var data = await dbUsers.view('user', 'for_test_api');
  var users = data.rows.map(row => row.value);

  var mapBlogsIdsForUser = async user => {
    var data = await dbBlogs.view('blog', 'ids_for_user', {
      key: user.id,
    });

    var userBlogs = data.rows.map(row => row.value);

    var response = await dbUsers.atomic('user', 'inplace', user.id, {
      field: 'blogs',
      value: userBlogs,
    });

    return response;
  };

  var response = await Promise.all(users.map(mapBlogsIdsForUser));
  return response;
}

async function createDb(dbName) {
  await nano.db.create(dbName);

  var designDocBody = dbName === config.DB_NAME ? blogDesignDoc : userDesignDoc;
  var designDocId = dbName === config.DB_NAME ? '_design/blog' : '_design/user';

  var db = nano.use(dbName);
  await db.insert(designDocBody, designDocId);
}

async function initialize() {
  var list = await nano.db.list();
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

  var passwordHash = await bcrypt.hash('mypass', 10);
  var user = {
    blogs: [],
    username: 'ouliana',
    name: 'Ouliana Kotik',
    passwordHash,
  };

  await dbUsers.insert(user);
}

async function seed() {
  await saveUsers();
  await saveBlogs();
  await setBlogsToUsers();

  var passwordHash = await bcrypt.hash('mypass', 10);
  var user = {
    blogs: [],
    username: 'ouliana',
    name: 'Ouliana Kotik',
    passwordHash,
  };

  await dbUsers.insert(user);
}

async function getToken() {
  const username = 'michaelchan';

  var data = await dbUsers.view('user', 'for_token', {
    key: username,
  });

  var userForToken = {
    username: data.rows[0].value.username,
    id: data.rows[0].value.id,
  };

  return jwt.sign(userForToken, process.env.SECRET);
}
