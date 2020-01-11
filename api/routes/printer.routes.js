/**
 * All routes of the printer object for the api
 */
module.exports = function (app) {
  const printer = require('../controllers/printer.controller');
  const user = require('../controllers/user.controller.js');

  app.route('/api/v1/printer/status')
    .get(user.protected, printer.getStatus);

  app.route('/api/v1/printer/progress')
    .get(user.protected, printer.getProgress);

  app.route('/api/v1/printer/info')
    .get(user.protected, printer.getInfo)
    .post(user.protected, printer.setInfo);

  app.route('/api/v1/printer/file')
    .get(user.protected, printer.getLoadedFile)
    .post(user.protected, printer.setLoadedFile);

}