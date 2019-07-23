/**
 * All routes of the printer object for the api
 */
module.exports = function (app) {
  const printer = require('../controllers/printer.controller');
  const user = require('../controllers/user.controller.js');

  app.route('/v1/printer/status')
    .get(user.protected, printer.getStatus);

  app.route('/v1/printer/progress')
    .get(user.protected, printer.getProgress);

}