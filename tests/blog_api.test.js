require('express-async-errors');
const supertest = require('supertest');
const app = require('../app');
const api = supertest(app);
const helper = require('./test_helper');

beforeEach(async () => {
  await helper.initialize();
});

describe('when there is initially some notes inserted', () => {
  test('blogs are return as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/);
  });

  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs');
    expect(response.body).toHaveLength(helper.initialBlogs.length);
  });

  test('all blogs have unique identifier property "id"', async () => {
    const response = await api.get('/api/blogs');
    response.body.forEach(r => expect(r.id).toBeDefined());
  });
});

describe('inserting a new blog', () => {
  test('succeds with valid data', async () => {
    await api
      .post('/api/blogs')
      .send(helper.newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);

    const finder = item => item.title === helper.canonic;
    const id = blogsAtEnd.find(finder).id;
    const blog = await helper.blogToCompare(id);

    expect(blog).toEqual(helper.newBlog);
  });

  test('succeeds with default data for missing property', async () => {
    await api.post('/api/blogs').send(helper.nonExistingLikes);

    const blogsAtEnd = await helper.blogsInDb();
    const finder = item => item.title === helper.canonic;
    const id = blogsAtEnd.find(finder).id;
    const blog = await helper.blogById(id);

    expect(blog.likes).toBe(0);
  });

  test('fails with statuscode 400 for invalid data', async () => {
    await api.post('/api/blogs').send(helper.missingTitle).expect(400);
    await api.post('/api/blogs').send(helper.missingAuthor).expect(400);
  });
});

describe('deletion of a blog', () => {
  test('succeeds with status code 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb();

    const blogToDelete = blogsAtStart[0];

    await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length - 1);

    const contents = blogsAtEnd.map(r => r.title);
    expect(contents).not.toContain(blogToDelete.title);
  });
});

describe('updating a blog', () => {
  test('succeeds with statuscode 200 if data is valid', async () => {
    const blogsAtStart = await helper.blogsInDb();

    const blogToUpdate = blogsAtStart[0];
    const id = blogToUpdate.id;
    delete blogToUpdate.id;
    delete blogToUpdate.rev;
    blogToUpdate.likes = 12;

    await api.put(`/api/blogs/${id}`).send(blogToUpdate);

    const updatedBlog = await helper.blogById(id);

    if (blogToUpdate.likes) {
      expect(updatedBlog.likes).toBe(blogToUpdate.likes);
    } else {
      expect(updatedBlog.likes).toBe(0);
    }
  });

  test('fails with statuscode 400 when data is invalid', async () => {
    const blogsAtStart = await helper.blogsInDb();

    const blogToUpdate = blogsAtStart[0];
    delete blogToUpdate.title;

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send(blogToUpdate)
      .expect(400);
  });
});
