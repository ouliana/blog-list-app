const Joi = require('joi');

const schema = Joi.object({
  title: Joi.string().min(3).required(),
  author: Joi.string().min(3).required(),
  url: Joi.string().min(3).required(),
  likes: Joi.number(),
  date: Joi.string(),
});

const validate = blog => {
  return schema.validateAsync(blog, { abortEarly: false });
};

module.exports = { validate };
