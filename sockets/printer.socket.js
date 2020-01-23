module.exports = function (io) {

  // required node packages
  const fs = require('fs');
  const socketHelper = require('../helper/socket.helper');
  const arrayHelper = require('../helper/array.helper');

  const consoleLog = [];

  // log event listener
  __printer.emitter.on('log', (data) => {

    if (consoleLog.length > 50) consoleLog.shift();
    consoleLog.push(data);
    io.emit('printLog', data);
    io.emit('printConsoleLog', consoleLog);
  });

  // progress event listener
  __printer.emitter.on('progress', (data) => {
    io.emit('printProgress', data);
  });

  // status event listener
  __printer.emitter.on('status', (data) => {
    io.emit('printStatus', data);
  });

  // temperature event listener
  __printer.emitter.on('temperature', (data) => {
    io.emit('printTemperature', data);
  });

  // event sender
  function eventEmitter(message) {
    //io.emit('printStatus', message);
    io.emit('printLog', message);
  }

  // listen for socket connections with authentication
  io.use(socketHelper.checkToken).on('connection', (socket) => {
  //io.on('connection', (socket) => {
    
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
      eventEmitter('moving ' + length + ' left');
    });

    socket.on('moveRight', (length) => {
      __printer.moveRight(parseFloat(length));
      eventEmitter('moving ' + length + ' right');
    });

    socket.on('moveForward', (length) => {
      __printer.moveForward(parseFloat(length));
      eventEmitter('moving ' + length + ' forward');
    });

    socket.on('moveBack', (length) => {
      __printer.moveBack(parseFloat(length));
      eventEmitter('moving ' + length + ' back');
    });

    socket.on('moveUp', (length) => {
      __printer.moveUp(parseFloat(length));
      eventEmitter('moving ' + length + ' up');
    });

    socket.on('moveDown', (length) => {
      __printer.moveDown(parseFloat(length));
      eventEmitter('moving ' + length + ' down');
    });

    socket.on('moveXYHome', () => {
      __printer.moveXYHome();
      eventEmitter('moving XY home');
    });

    socket.on('moveZHome', () => {
      __printer.moveZHome();
      eventEmitter('moving Z home');
    });

    socket.on('fanOn', (speed) => {
      __printer.fanOn(parseInt(speed));
      eventEmitter('turning fan on with a speed of ' + speed);
    });

    socket.on('fanOff', () => {
      __printer.fanOff();
      eventEmitter('turning fan off');
    });

    socket.on('sendManualCommand', (cmd) => {
      __printer.sendManualCommand(cmd);
      eventEmitter('sending: ' + cmd);
    });

    socket.on('extrude', (length) => {
      __printer.extrude(parseFloat(length));
      eventEmitter('extruding ' + length);
    });

    socket.on('retract', (length) => {
      __printer.retract(parseFloat(length));
      eventEmitter('retracting ' + length);
    });

    socket.on('setHotendTemperature', (temp) => {
      __printer.setHotendTemperature(parseInt(temp));
      eventEmitter('set hotend temperature to ' + temp);
    });

    socket.on('setHeatbedTemperature', (temp) => {
      __printer.setHeatbedTemperature(parseInt(temp));
      eventEmitter('set heatbed temperature to ' + temp);
    });

    socket.on('cancelPrint', () => {
      __printer.stop();
    });

    socket.on('loadFile', (file) => {
      io.emit('newFileToPrint', file);
    });

    socket.on('deleteLoadedFile', () => {
      io.emit('deleteLoadedFile');
    });

  });

}