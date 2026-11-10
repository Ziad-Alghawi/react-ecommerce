// Express 4 doesn't catch a rejected promise from a route, so a failed database
// call would crash the server instead of reaching the error handler
export function asyncHandler(handler) {
  return (req, res, next) => handler(req, res, next).catch(next);
}
