//const nano = require('nano')(COUCH_URI);

//const nano = require('nano')(process.env.COUCHDB_URI);
const nano = require('nano')('http://admin:sxfng64@127.0.0.1:5984');

const blogs = nano.use('blogs');

const create = async blog => {
  try {
    const response = await blogs.insert(blog);
    console.log(response);
    const doc = await blogs.get(response.id);
    return doc;
  } catch (err) {
    throw new Error(err);
  }
};

const getAll = async () => {
  try {
    const body = await blogs.view('blog', 'byid', { include_docs: true });
    return body.rows;
  } catch (err) {
    throw new Error(err);
  }
};

const getById = async id => {
  try {
    const doc = await blogs.get(id);
    return doc;
  } catch (err) {
    throw new Error(err);
  }
};

const destroy = async id => {
  try {
    const doc = await blogs.get(id);
    console.log(doc._id, doc._rev);
    await blogs.destroy(doc._id, doc._rev);
  } catch (err) {
    throw new Error(err);
  }
};

update = async (id, fieldName, newValue) => {
  try {
    const response = await blogs.atomic('note', 'inplace', id, {
      field: fieldName,
      value: newValue,
    });
    return response;
  } catch (err) {
    throw new Error(err);
  }
};

module.exports = {
  create,
  getAll,
  getById,
  destroy,
  update,
};
