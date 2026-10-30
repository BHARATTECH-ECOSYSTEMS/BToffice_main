// Express 5 leaves req.body undefined when a request carries none; every route reads it as an object, so a request
// with no body is read as an empty one (a plain 400 from the route's own checks, not a crash). Multipart routes fill
// it in themselves later.
const emptyBody = (req, _res, next) => {
  req.body ??= {};
  next();
};

module.exports = { emptyBody };
