require('express-async-errors');
const bcrypt = require('bcrypt');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);
const Joi = require('joi');
const UniquenessError = require('../utils/errors/uniqueness_error');
const ValidationError = require('../utils/errors/validation_error');

const dbUsers = nano.use(config.DB_USERS);

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
  const response = await dbUsers.view('user', 'id_by_username', {
    key: username,
  });

  if (response.rows.length) {
    throw new UniquenessError('expected `username` to be unique');
  }
};

const findUserBlogs = async ids => {
  const dbBlogs = nano.use(config.DB_NAME);

  const promises = ids.map(id => {
    const data = dbBlogs.view('blog', 'for_user', { key: id });
    return data.rows[0].value;
  });

  const result = await Promise.all(promises);

  return result;
};

const findOne = async (findBy, view) => {
  console.log({ findBy, view });
  const doc = await dbUsers.view('user', view, { key: findBy });
  if (!doc.rows.length) return null;

  return doc.rows[0].value;
};

const find = async () => {
  const data = await dbUsers.view('user', 'to_show');

  const promises = data.rows.map(async row => {
    if (row.value.blogs.length > 0) {
      const userBlogs = await findUserBlogs(row.value.blogs);
      row.value.blogs = userBlogs;
    }
    return row.value;
  });

  const returnedUsers = await Promise.all(promises);

  return returnedUsers;
};

const save = async user => {
  const validation = validate(user);
  if (validation.error) throw new Error(validation.error);

  const saltRounds = 10;
  user.passwordHash = await bcrypt.hash(user.password, saltRounds);
  delete user.password;

  const response = await dbUsers.insert(user);
  const data = await dbUsers.view('user', 'to_show', {
    key: response.id,
  });

  return data.rows[0].value;
};

const destroy = async id => {
  const doc = await dbUsers.get(id);
  await dbUsers.destroy(doc._id, doc._rev);
};

const updateBlogs = async (id, blogId, action) => {
  console.log({ id, blogId, action });
  const data = await dbUsers.view('user', 'for_api', { key: id });
  const currentBlogs = data.rows[0].value;

  const blogs =
    action === 'insert'
      ? currentBlogs.concat(blogId)
      : currentBlogs.filter(blog => blog.id !== blogId);

  await dbUsers.atomic('user', 'inplace', id, {
    field: 'blogs',
    value: blogs,
  });
};

module.exports = {
  isUnique,
  validate,
  save,
  find,
  findOne,
  destroy,
  updateBlogs,
};
