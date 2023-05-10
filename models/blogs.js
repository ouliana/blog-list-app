require('express-async-errors');
var config = require('../utils/config');
var nano = require('nano')(config.COUCHDB_URI);
var Joi = require('joi');
var ValidationError = require('../utils/errors/validation_error');

// public API
module.exports = {
  save,
  find,
  findOne,
  destroy,
  update,
  clear,
};

// implementation

const schema = Joi.object({
  title: Joi.string().min(3).required(),
  author: Joi.string().min(3).required(),
  url: Joi.string().min(3).required(),
  likes: Joi.number(),
  date: Joi.date(),
  user: Joi.string(),
  comments: Joi.array(),
});

function validate(blog) {
  var result = schema.validate(blog, { abortEarly: false });
  if (result.error) {
    var message = result.error.details.map(d => d.message).join(', ');
    result.error = message;
    throw new ValidationError(message);
  }
  return result;
}

var dbBlogs = nano.use(config.DB_NAME);
var designDocId = '_design/blog';

async function find() {
  var data = await dbBlogs.view('blog', 'by_id');
  if (!data.rows.length) return null;

  var mapUserDetailsToView = async row => {
    var userDetails = await nano.use(config.DB_USERS).view('user', 'for_blog', {
      key: row.value.user,
    });
    return {
      ...row.value,
      user: userDetails.rows[0].value,
    };
  };

  var promises = data.rows.map(mapUserDetailsToView);

  var returnedBlogs = await Promise.all(promises);

  return returnedBlogs;
}

async function findOne(id, view) {
  var doc = await dbBlogs.view('blog', view, { key: id });
  if (!doc.rows.length) return null;

  var blog = doc.rows[0].value;

  var userInfo = await nano.use(config.DB_USERS).view('user', 'for_blog', {
    key: blog.user,
  });

  return {
    ...blog,
    user: userInfo.rows[0].value,
  };
}

async function save(blog) {
  var validationResult = validate(blog);
  if (validationResult.error) throw new Error(validationResult.error);

  var response = await dbBlogs.insert(blog);

  var savedBlog = await dbBlogs.view('blog', 'by_id', {
    key: response.id,
  });

  return savedBlog.rows[0].value;
}

async function destroy(id) {
  var doc = await dbBlogs.get(id);
  var result = await dbBlogs.destroy(doc._id, doc._rev);
  return result;
}

async function update(id, body) {
  validate(body);

  await dbBlogs.atomic('blog', 'inplace', id, {
    field: 'likes',
    value: body.likes,
  });

  var updatedBlog = await dbBlogs.view('blog', 'by_id', {
    key: id,
  });

  return updatedBlog.rows[0].value;
}

async function clear() {
  var doclist = await dbBlogs.list();
  var onlyDocs = doclist.rows.filter(doc => doc.id !== designDocId);

  var promises = onlyDocs.map(doc => dbBlogs.destroy(doc.id, doc.value.rev));

  await Promise.all(promises);
}
