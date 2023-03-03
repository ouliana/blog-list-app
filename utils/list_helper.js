const dummy = blogs => {
  return blogs ? 1 : 1;
};

const totalLikes = blogs => {
  const reducer = (sum, blog) => sum + blog.likes;
  return blogs.reduce(reducer, 0);
};

const favoriteBlog = blogs => {
  const reducer = (fav, blog) => {
    return fav.likes < blog.likes ? blog : fav;
  };
  const favorite = blogs.reduce(reducer, blogs[0] ?? {});
  return {
    title: favorite.title,
    author: favorite.author,
    likes: favorite.likes,
  };
};

const mostBlogs = blogs => {
  const mapped = blogs.map(blog => {
    const reducer = (sum, current) => {
      return current.author === blog.author ? sum + 1 : sum;
    };

    return {
      author: blog.author,
      blogs: blogs.reduce(reducer, 0),
    };
  });

  return mapped.reduce((top, current) =>
    top.blogs < current.blogs ? current : top
  );
};

const mostLikes = blogs => {
  const mapped = blogs.map(blog => {
    const reducer = (sum, current) => {
      return current.author === blog.author ? sum + current.likes : sum;
    };

    return {
      author: blog.author,
      likes: blogs.reduce(reducer, 0),
    };
  });

  return mapped.reduce((max, current) =>
    max.likes < current.likes ? current : max
  );
};

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes,
};
