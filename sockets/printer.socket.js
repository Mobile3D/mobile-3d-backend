module.exports = function (io) {

  // required node packages
  const fs = require('fs');
  const socketHelper = require('../helper/socket.helper');
  const arrayHelper = require('../helper/array.helper');
  const printerHelper = require('../helper/printer.helper');
  const printer = new printerHelper('COM3', 9600);

  // listen for socket connections with authentication
  //io.use(socketHelper.checkToken).on('connection', (socket) => {
  io.on('connection', (socket) => {
    
    // printFile event listener
    socket.on('printFile', (data) => {
      
      // if required parameters are missing
      if (data._id === undefined) {
        // emit an error
        return socket.emit('printError', {
          error: {
            code: 'ER_MISSING_PARAMS',
            message: 'ER_MISSING_PARAMS: Some parameters are missing. Required parameters: _id'
          }
        });
      }

      // read the uploads file
      fs.readFile(__basedir + '/data/uploads.json', 'utf8', function (err, uploadsString) {
    
        // error reading the file
        if (err) {
          return socket.emit('printError', {
            error: {
              code: 'ER_INTERNAL',
              message: err.message
            }
          });
        }
    
        // convert string to object
        let uploads = JSON.parse(uploadsString);
        // get requested upload
        let upload = arrayHelper.findById(parseInt(data._id), uploads);
        
        // if upload has not been found
        if (!upload) {
          return socket.emit('printError', {
            error: {
              code: 'ER_UPLOAD_NOT_FOUND',
              message: 'ER_UPLOAD_NOT_FOUND: There is no upload with this id.'
            }
          });
        }

        // progress event listener
        printer.emitter.on('progress', (data) => {
          console.log(data);
        });

        // status event listener
        printer.emitter.on('status', (data) => {
          console.log(data);
        });

        // print the file
        printer.printFile(__basedir + '/files/' + upload.filename);

        // emit a success event
        socket.emit('printSuccess', {
          success: {
            code: 'OK_PRINTING',
            message: 'OK_PRINTING: The file is going to be printed.',
            file: upload
          }
        });

      });

    });

    socket.on('pausePrint', () => {
      printer.paused = true;
    });

    socket.on('unpausePrint', () => {
      printer.paused = false;
    });

    socket.on('cancelPrint', () => {
      printer.stopped = true;
    });

  });

}