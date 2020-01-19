/**
 * All routes of the connection object for the api
 */
module.exports = function (app) {
  const connection = require('../controllers/connection.controller.js');
  const user = require('../controllers/user.controller');

  app.route('/api/v1/connection')
    .get(user.protected, connection.getConnection)
    .post(user.protected, connection.setConnection);

  app.route('/api/v1/ports')
    .get(user.protected, connection.getAvailablePorts);

};