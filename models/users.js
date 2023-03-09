require('express-async-errors');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);
const Joi = require('joi');
const UniquenessError = require('../utils/errors/uniqueness_error');
const ValidationError = require('../utils/errors/validation_error');
const common = require('../models/common');

const users = nano.use(config.DB_USERS);

const schema = Joi.object({
  username: Joi.string().min(3).required(),
  name: Joi.string().allow('').optional(),
  password: Joi.string().min(6).required(),
  blogs: Joi.array(),
});

const validate = user => {
  const result = schema.validate(user, { abortEarly: false });
  if (result.error) {
    const message = result.error.details.map(d => d.message).join(', ');
    throw new ValidationError(message);
  }
  return result;
};

const isUnique = async username => {
  const response = await users.view('user', 'idbyusername', { key: username });

  if (response.rows.length) {
    throw new UniquenessError('expected `username` to be unique');
  }
};

const findBlogs = async blogsArray => {
  const response = await Promise.all(
    blogsArray.map(n => common.findById(n, 'blogs'))
  );
  return response;
};

const findUser = async username => {
  const doc = await users.view('user', 'by_username', {
    key: username,
  });

  return doc.rows[0].value;
};

const getUserInfo = async username => {
  const doc = await users.view('user', 'user_info', {
    key: username,
  });

  return doc.rows[0].value;
};

const find = async () => {
  const body = await users.view('user', 'by_username', { include_docs: true });

  const returnedUsers = Promise.all(
    body.rows.map(async r => {
      console.log('r.value: ', r.value);
      const user = r.value;
      if (r.value.blogs.length > 0) {
        const userBlogs = await findBlogs(r.value.blogs);
        user.blogs = userBlogs;
      }
      return user;
    })
  );

  return returnedUsers;
};

const save = async user => {
  const response = await users.insert(user);
  const doc = await users.view('user', 'by_id', { key: response.id });

  return doc.rows[0].value;
};

const destroy = async id => {
  const doc = await users.get(id);
  await users.destroy(doc._id, doc._rev);
};

const updateBlogs = async function (id, blogs) {
  await users.atomic('user', 'inplace', id, {
    field: 'blogs',
    value: blogs,
  });
};

module.exports = {
  isUnique,
  validate,
  save,
  find,
  findUser,
  getUserInfo,
  destroy,
  updateBlogs,
};
