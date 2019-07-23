/**
 * All routes of the user object for the api
 */
module.exports = function (app) {
  const user = require('../controllers/user.controller.js');

  app.route('/v1/users')
    .get(user.protected, user.getAll)
    .post(user.protected, user.register);

  app.route('/v1/auth/login')
    .post(user.login);

  app.route('/v1/user')
    .get(user.protected, user.lookup);

  app.route('/v1/users/:user_id')
    .get(user.protected, user.get)
    .delete(user.protected, user.delete);
};