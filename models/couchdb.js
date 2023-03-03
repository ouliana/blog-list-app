require('express-async-errors');
const config = require('../utils/config');
const nano = require('nano')(config.COUCHDB_URI);

const blogs = nano.use(config.DB_NAME);

const create = async blog => {
  const response = await blogs.insert(blog);
  const doc = await blogs.get(response.id, { include_docs: true });
  ({ _id: doc.id, _rev: doc.rev } = doc);
  delete doc._id;
  delete doc._rev;
  return doc;
};

const getAll = async () => {
  const body = await blogs.view('blog', 'bydate', { include_docs: true });
  const response = body.rows.map(entry => {
    const doc = entry.doc;
    ({ _id: doc.id, _rev: doc.rev } = doc);
    delete doc._id;
    delete doc._rev;
    return doc;
  });
  return response;
};

const getById = async id => {
  const doc = await blogs.get(id);
  ({ _id: doc.id, _rev: doc.rev } = doc);
  delete doc._id;
  delete doc._rev;
  return doc;
};

const destroy = async id => {
  const entry = await blogs.get(id);
  await blogs.destroy(entry._id, entry._rev);
};

const update = async (id, fieldName, newValue) => {
  const response = await blogs.atomic('blog', 'inplace', id, {
    field: fieldName,
    value: newValue,
  });
  return response;
};

module.exports = {
  create,
  getAll,
  getById,
  destroy,
  update,
};
