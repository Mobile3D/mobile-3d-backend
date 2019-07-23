module.exports = function (io) {

  // required node packages
  const fs = require('fs');
  const socketHelper = require('../helper/socket.helper');
  const arrayHelper = require('../helper/array.helper');

  // log event listener
  __printer.emitter.on('log', (data) => {
    io.emit('printLog', data);
  });

  // progress event listener
  __printer.emitter.on('progress', (data) => {
    io.emit('printProgress', data);
  });

  // status event listener
  __printer.emitter.on('status', (data) => {
    io.emit('printStatus', data);
  });

  // listen for socket connections with authentication
  //io.use(socketHelper.checkToken).on('connection', (socket) => {
  io.on('connection', (socket) => {
    
    // printFile event listener
    socket.on('printFile', (_id) => {
      
      // if required parameters are missing
      if (_id === undefined || _id === null) {
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
        let upload = arrayHelper.findById(parseInt(_id), uploads);
        
        // if upload has not been found
        if (!upload) {
          return socket.emit('printError', {
            error: {
              code: 'ER_UPLOAD_NOT_FOUND',
              message: 'ER_UPLOAD_NOT_FOUND: There is no upload with this id.'
            }
          });
        }

        // print the file
        __printer.printFile(__basedir + '/files/' + upload.filename);

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

    socket.on('moveLeft', (length) => {
      __printer.moveLeft(parseFloat(length));
    });

    socket.on('moveRight', (length) => {
      __printer.moveRight(parseFloat(length));
    });

    socket.on('moveForward', (length) => {
      __printer.moveForward(parseFloat(length));
    });

    socket.on('moveBack', (length) => {
      __printer.moveBack(parseFloat(length));
    });

    socket.on('moveUp', (length) => {
      __printer.moveUp(parseFloat(length));
    });

    socket.on('moveDown', (length) => {
      __printer.moveDown(parseFloat(length));
    });

    socket.on('moveXYHome', () => {
      __printer.moveXYHome();
    });

    socket.on('moveZHome', () => {
      __printer.moveZHome();
    });

    socket.on('fanOn', (speed) => {
      __printer.fanOn(parseInt(speed));
    });

    socket.on('fanOff', () => {
      __printer.fanOff();
    });

    socket.on('sendManualCommand', (cmd) => {
      __printer.sendManualCommand(cmd);
    });

    socket.on('extrude', () => {
      __printer.extrude();
    });

    socket.on('retract', () => {
      __printer.retract();
    });

    socket.on('cancelPrint', () => {
      __printer.stop();
    });

  });

}