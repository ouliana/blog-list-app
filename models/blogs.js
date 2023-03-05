require('express-async-errors');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);
const Joi = require('joi');
const ValidationError = require('../utils/errors/validation_error');
const common = require('../models/common');

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
    console.log('Error in validation: ', result.error);
    const message = result.error.details.map(d => d.message).join(', ');
    result.error = message;
    throw new ValidationError(message);
  }
  return result;
};

const blogs = nano.use(config.DB_NAME);

const save = async blog => {
  validate(blog);

  const response = await blogs.insert(blog);

  const savedBlog = await blogs.view('blog', 'by_id', { key: response.id });

  return savedBlog.rows[0].value;
};

const find = async () => {
  const blogsFromDb = await blogs.view('blog', 'by_date');

  const blogsToReturn = Promise.all(
    blogsFromDb.rows.map(async r => {
      r.value.user = await common.findById(r.value.user, 'users');
      return r.value;
    })
  );

  return blogsToReturn;
};

const destroy = async id => {
  const entry = await blogs.get(id);
  await blogs.destroy(entry._id, entry._rev);
};

const update = async request => {
  const body = request.body;

  const { url, title, author, date, user, likes } = body;
  validate({ url, title, author, date, user, likes });

  ({ id: body._id, rev: body._rev } = body);
  delete body.id;
  delete body.rev;

  const response = await blogs.insert(body);

  const savedBlog = await blogs.view('blog', 'by_id', { key: response.id });

  return savedBlog.rows[0].value;
};

module.exports = {
  save,
  find,
  destroy,
  update,
};
