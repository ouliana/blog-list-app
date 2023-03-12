require('express-async-errors');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);
const Joi = require('joi');
const ValidationError = require('../utils/errors/validation_error');

const schema = Joi.object({
  title: Joi.string().min(3).required(),
  author: Joi.string().min(3).required(),
  url: Joi.string().min(3).required(),
  likes: Joi.number(),
  date: Joi.date(),
  user: Joi.string(),
});

const validate = blog => {
  const result = schema.validate(blog, { abortEarly: false });
  if (result.error) {
    const message = result.error.details.map(d => d.message).join(', ');
    result.error = message;
    throw new ValidationError(message);
  }
  return result;
};

const dbBlogs = nano.use(config.DB_NAME);

const find = async () => {
  const dbUsers = nano.use(config.DB_USERS);

  const data = await dbBlogs.view('blog', 'to_show');

  const promises = data.rows.map(async row => {
    const userInfo = await dbUsers.view('user', 'for_blog', {
      key: row.value.user,
    });
    return {
      ...row.value,
      user: userInfo.rows[0].value,
    };
  });

  const returnedNotes = await Promise.all(promises);

  return returnedNotes;
};

const findOne = async (id, view) => {
  const dbUsers = nano.use(config.DB_USERS);

  const doc = await dbBlogs.view('blog', view, { key: id });
  if (!doc.rows.length) return null;

  const blog = doc.rows[0].value;

  const userInfo = await dbUsers.view('user', 'for_blog', {
    key: blog.user,
  });

  return {
    ...blog,
    user: userInfo.rows[0].value,
  };
};

const save = async blog => {
  validate(blog);

  const response = await dbBlogs.insert(blog);

  const savedBlog = await dbBlogs.view('blog', 'to_show', {
    key: response.id,
  });

  return savedBlog.rows[0].value;
};

const destroy = async id => {
  const doc = await dbBlogs.get(id);
  const result = await dbBlogs.destroy(doc._id, doc._rev);
  return result;
};

const update = async request => {
  validate(request.body);

  await dbBlogs.atomic('blog', 'inplace', request.params.id, {
    field: 'likes',
    value: request.body.likes,
  });

  const updatedBlog = await dbBlogs.view('blog', 'to_show', {
    key: request.params.id,
  });

  return updatedBlog.rows[0].value;
};

module.exports = {
  save,
  find,
  findOne,
  destroy,
  update,
};
