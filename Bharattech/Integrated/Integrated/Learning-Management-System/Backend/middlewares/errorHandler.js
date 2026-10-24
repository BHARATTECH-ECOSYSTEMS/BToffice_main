// The last-resort error handler (server.js, after every route). The details go to the server log; the caller gets a
// plain message, never error text or a stack trace. A 4xx that is meant to be shown (e.g. a body that isn't JSON:
// http-errors mark those `expose`) keeps its own words.
const errorHandler = (err, req, res, next) => {
  console.error("Server Error:", err);
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = status >= 500 ? "Internal Server Error" : err.expose ? err.message : "Bad request";
  res.status(status).json({ message });
};

module.exports = { errorHandler };
