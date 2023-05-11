require('express-async-errors');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);
const Joi = require('joi');
const ValidationError = require('../utils/errors/validation_error');

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
  const result = schema.validate(blog, { abortEarly: false });
  if (result.error) {
    const message = result.error.details.map(d => d.message).join(', ');
    result.error = message;
    throw new ValidationError(message);
  }
  return result;
}

const dbBlogs = nano.use(config.DB_NAME);
const designDocId = '_design/blog';

async function find() {
  const data = await dbBlogs.view('blog', 'by_id');
  if (!data.rows.length) return null;

  const mapUserDetailsToView = async row => {
    const userDetails = await nano
      .use(config.DB_USERS)
      .view('user', 'for_blog', {
        key: row.value.user,
      });
    return {
      ...row.value,
      user: userDetails.rows[0].value,
    };
  };

  const promises = data.rows.map(mapUserDetailsToView);

  const returnedBlogs = await Promise.all(promises);

  return returnedBlogs;
}

async function findOne(id, view) {
  const doc = await dbBlogs.view('blog', view, { key: id });
  if (!doc.rows.length) return null;

  const blog = doc.rows[0].value;

  const userInfo = await nano.use(config.DB_USERS).view('user', 'for_blog', {
    key: blog.user,
  });

  return {
    ...blog,
    user: userInfo.rows[0].value,
  };
}

async function save(blog) {
  const validationResult = validate(blog);
  if (validationResult.error) throw new Error(validationResult.error);

  const response = await dbBlogs.insert(blog);

  const savedBlog = await dbBlogs.view('blog', 'by_id', {
    key: response.id,
  });

  return savedBlog.rows[0].value;
}

async function destroy(id) {
  const doc = await dbBlogs.get(id);
  const response = await dbBlogs.destroy(doc._id, doc._rev);
  return response;
}

async function update(id, body) {
  validate(body);

  const doc = await dbBlogs.get(id);

  const blog = {
    ...doc,
    likes: body.likes,
    comments: body.comments,
  };
  const response = await dbBlogs.insert(blog);

  console.log(response);

  return response;
}

async function clear() {
  const doclist = await dbBlogs.list();
  const onlyDocs = doclist.rows.filter(doc => doc.id !== designDocId);

  const promises = onlyDocs.map(doc => dbBlogs.destroy(doc.id, doc.value.rev));

  await Promise.all(promises);
}
