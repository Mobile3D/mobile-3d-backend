module.exports = function () {

  const printerHelper = require('./helper/printer.helper');
  global.__printer = new printerHelper('COM3', 250000);

  global.__host = 'localhost';
  global.__port = 4000;
}