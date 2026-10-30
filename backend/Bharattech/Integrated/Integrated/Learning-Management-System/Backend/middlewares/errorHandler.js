// The last-resort error handler (server.js, after every route). The details go to the server log; the caller gets a
// plain message, never error text or a stack trace. A 4xx that is meant to be shown (e.g. a body that isn't JSON:
// http-errors mark those `expose`) keeps its own words.
// Never the error as it is: a body that isn't JSON comes with the whole body on it (`err.body`), passwords included,
// and its message can quote a slice of that body; other libraries hang request data on their errors too. An error
// from reading the request (it has a `type`) is logged by its kind only.
const forTheLog = (err) =>
  err?.type ? { type: err.type, status: err.status } : { name: err?.name, message: err?.message, status: err?.status, stack: err?.stack };

const errorHandler = (err, req, res, next) => {
  console.error("Server Error:", forTheLog(err));
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = status >= 500 ? "Internal Server Error" : err.expose ? err.message : "Bad request";
  res.status(status).json({ message });
};

module.exports = { errorHandler };
