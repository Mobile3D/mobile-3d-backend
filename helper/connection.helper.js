// required node packages
const fs = require('fs');
const serialport = require("serialport");

/**
 * Function for getting the connection details of the 3D-Printer
 * 
 * @returns {object} connection details
 */
exports.getConnection = function () {
  return JSON.parse(fs.readFileSync(__basedir + '/data/connection.json', 'utf8'));
}

/**
 * Function for setting the connection if only one connection is available
 */
exports.initConnection = function () {

  let connection = JSON.parse(fs.readFileSync(__basedir + '/data/connection.json', 'utf8'));

  serialport.list(function (err, ports) {

    let realPorts = [];

    for (let i = 0; i < ports.length; i++) {
      if (ports[i].serialNumber !== undefined) {
        realPorts.push(ports[i]);
      }
    }
    
    if (realPorts.length === 1 && connection.port !== realPorts[0].comName) {
      connection.port = realPorts[0].comName;
      fs.writeFileSync(__basedir + '/data/connection.json', JSON.stringify(connection));
    }

  });

}