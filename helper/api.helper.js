/**
 * Function for checking if the route exists, and if it does not
 * return a not found error
 * 
 * @returns {object}
 */
exports.checkRoute = function (req, res) {
  /* if (req.url === '/' && req.accepts('html')) {
    return res.redirect('https://poscher.me');
  } */
  return res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'ROUTE_NOT_FOUND: The given route was not found.',
      url: req.url
    }
  });
}