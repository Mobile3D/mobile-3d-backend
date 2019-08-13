const fs = require('fs');

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