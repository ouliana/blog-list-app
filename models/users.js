require('express-async-errors');
var bcrypt = require('bcrypt');
var config = require('../utils/config');
var nano = require('nano')(config.COUCHDB_URI);
var Joi = require('joi');
var UniquenessError = require('../utils/errors/uniqueness_error');
var ValidationError = require('../utils/errors/validation_error');

// public API

Object.assign(module.exports, {
  isUnique,
  validate,
  save,
  find,
  findOne,
  destroy,
  updateBlogs,
  clear,
});

// implementarion

var dbUsers = nano.use(config.DB_USERS);
var designDocId = '_design/user';

const schema = Joi.object({
  username: Joi.string().min(3).required(),
  name: Joi.string().allow('').optional(),
  password: Joi.string().min(6).required(),
  blogs: Joi.array(),
});

function validate(user) {
  var result = schema.validate(user, { abortEarly: false });
  if (result.error) {
    var message = result.error.details.map(d => d.message).join(', ');
    throw new ValidationError(message);
  }
  return result;
}

async function isUnique(username) {
  var data = await dbUsers.view('user', 'id_by_username', {
    key: username,
  });
  console.log({ username, data });
  if (data.rows.length) {
    throw new UniquenessError('expected `username` to be unique');
  }
}

async function findUserBlogs(blogIds) {
  var mapBlogsToUser = id => {
    const data = nano.use(config.DB_NAME).view('blog', 'for_user', { key: id });
    return data.rows[0].value;
  };

  var result = await Promise.all(blogIds.map(mapBlogsToUser));

  return result;
}

async function findOne(findBy, view) {
  var doc = await dbUsers.view('user', view, { key: findBy });
  if (!doc.rows.length) return null;

  return doc.rows[0].value;
}

async function find() {
  var data = await dbUsers.view('user', 'to_show');

  var mapBlogDetailsToUser = async row => {
    if (row.value.blogs.length > 0) {
      let userBlogs = await findUserBlogs(row.value.blogs);
      row.value.blogs = userBlogs;
    }
    return row.value;
  };

  var returnedUsers = await Promise.all(data.rows.map(mapBlogDetailsToUser));

  return returnedUsers;
}

async function save(user) {
  var validation = validate(user);
  if (validation.error) throw new Error(validation.error);

  const saltRounds = 10;
  user.passwordHash = await bcrypt.hash(user.password, saltRounds);
  delete user.password;

  var response = await dbUsers.insert(user);
  var data = await dbUsers.view('user', 'to_show', {
    key: response.id,
  });

  return data.rows[0].value;
}

async function destroy(id) {
  var doc = await dbUsers.get(id);
  await dbUsers.destroy(doc._id, doc._rev);
}

async function updateBlogs(id, blogId, action) {
  console.log({ id, blogId, action });
  var data = await dbUsers.view('user', 'blogs_by_id', { key: id });
  var currentBlogs = data.rows[0].value ?? [];

  var blogs =
    action === 'insert'
      ? currentBlogs.concat(blogId)
      : currentBlogs.filter(blog => blog.id !== blogId);

  await dbUsers.atomic('user', 'inplace', id, {
    field: 'blogs',
    value: blogs,
  });
}

async function clear() {
  var doclist = await dbUsers.list();
  var onlyDocs = doclist.rows.filter(doc => doc.id !== designDocId);

  var promises = onlyDocs.map(doc => dbUsers.destroy(doc.id, doc.value.rev));

  await Promise.all(promises);
}
