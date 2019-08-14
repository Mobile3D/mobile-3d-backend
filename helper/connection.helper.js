// required node packages
const fs = require('fs');

/**
 * Function for getting the connection details of the 3D-Printer
 * 
 * @returns {object} connection details
 */
exports.getConnection = function () {
  return JSON.parse(fs.readFileSync(__basedir + '/data/connection.json', 'utf8'));
}