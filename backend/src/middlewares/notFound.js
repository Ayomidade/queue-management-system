const notFoundHandler = (req, res, next) => {
  const error = new Error("Route not found");
  error.statusCode = 404;
  next(error);
};

export default notFoundHandler