// required node packages
const fs = require('fs');
const serialport = require("serialport");

/**
 * Function to set connection details for the 3D-Printer
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} error or the new connection details
 */
exports.setConnection = function (req, res) {

  // check if required parameters are given
  if (req.body.port === undefined ||
      req.body.baudrate === undefined) {

    return res.status(400).json({
      error: {
        code: 'ER_MISSING_PARAMS',
        message: 'ER_MISSING_PARAMS: Some parameters are missing. Required parameters: port, baudrate'
      }
    });

  }

  // create a new connection object
  let newConnection = {
    port: req.body.port,
    baudrate: req.body.baudrate
  }

  // write the file
  fs.writeFile(__basedir + '/data/connection.json', JSON.stringify(newConnection), function (err) {

    // writing error
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    // return file object
    res.status(201).json(newConnection);

  });

}

/**
 * Function to get connection details for the 3D-Printer
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} error or the connection details
 */
exports.getConnection = function (req, res) {

  // read the file
  fs.readFile(__basedir + '/data/connection.json', 'utf8', function (err, data) {
    
    // error reading the file
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    // return the array
    return res.json(JSON.parse(data));    

  });

}

/**
 * Function to get available ports for the 3D-Printer
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} error or the available ports details
 */
exports.getAvailablePorts = function (req, res) {
  serialport.list(function (err, ports) {

    // error getting ports
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    // for (let i = 0; i < ports.length; i++) {
    //   if (ports[i].manufacturer === undefined) {
    //     ports.splice(i);
    //   }
    // }

    // return the array
    return res.json(ports); 

  });
}