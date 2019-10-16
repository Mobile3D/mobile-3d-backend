// required node packages
const fs = require('fs');

/**
 * Function for getting all information about the 3D-Printer
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} info object
 */
exports.getInfo = function (req, res) {

  // read the file
  fs.readFile(__basedir + '/data/printer.json', 'utf8', function (err, data) {
    
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
 * Function for setting all information about the 3D-Printer
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} info object
 */
exports.setInfo = function (req, res) {

  // check if required parameters are given
  if (req.body.name === undefined) {

    return res.status(400).json({
      error: {
        code: 'ER_MISSING_PARAMS',
        message: 'ER_MISSING_PARAMS: Some parameters are missing. Required parameters: name'
      }
    });

  }

  // create a new connection object
  let newPrinter = {
    name: req.body.name
  }

  // write the file
  fs.writeFile(__basedir + '/data/printer.json', JSON.stringify(newPrinter), function (err) {

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
    res.status(201).json(newPrinter);

  });

}

/**
 * Function for getting the current status of the 3D-Printer
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} status object
 */
exports.getStatus = function (req, res) {

  const ready = __printer.isReady();
  const connected = __printer.isConnected();
  const busy = __printer.isBusy();

  return res.json({
    status: {
      ready: ready,
      connected: connected,
      busy: busy
    }
  });

}

/**
 * Function for getting the current progress of the 3D-Printer
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} progress object
 */
exports.getProgress = function (req, res) {
  return res.json({
    progress: __printer.getProgress()
  });
}