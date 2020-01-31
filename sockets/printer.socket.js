module.exports = function (io) {

  // required node packages
  const fs = require('fs');
  const socketHelper = require('../helper/socket.helper');
  const arrayHelper = require('../helper/array.helper');

  // log array for console
  const consoleLog = [];
  // file to print in case the print is being paused
  let fileToPrint = '';
  // the line the print has been paused
  let pausedLine = 0;

  // log event listener
  __printer.emitter.on('log', (data) => {

    if (consoleLog.length > 50) consoleLog.shift();
    consoleLog.push(data);
    io.emit('log', data);
    io.emit('consoleLog', consoleLog);
  });

  // progress event listener
  __printer.emitter.on('progress', (data) => {
    io.emit('progress', data);
  });

  // status event listener
  __printer.emitter.on('status', (status) => {
    io.emit('status', status);
  });

  // temperature event listener
  __printer.emitter.on('temperature', (data) => {
    io.emit('temperature', data);
  });

  // event sender
  function eventEmitter(message) {
    io.emit('log', message);
  }

  // listen for socket connections with authentication
  io.use(socketHelper.checkToken).on('connection', (socket) => {
  //io.on('connection', (socket) => {

    // inform the new connected user with the latest information
    io.emit('info', {
      status: __printer.getStatus(),
      progress: __printer.getProgress(),
      temperature: __printer.getTemperature()
    });
    
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
        fileToPrint = upload.filename;

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

    // cancelPrint event listener
    socket.on('cancelPrint', () => {
      __printer.stop();
    });

    // pausePrint event listener
    socket.on('pausePrint', () => {
      __printer.pause();
      pausedLine = __printer.getLineCount();
    });

    // unpausePrint event listener
    socket.on('unpausePrint', () => {
      if (__printer.isPaused()) {
        __printer.unpause();
        __printer.printFile(__basedir + '/files/' + fileToPrint, pausedLine);
      }
    });

    // moveLeft event listener
    socket.on('moveLeft', (length) => {
      __printer.moveLeft(parseFloat(length));
      eventEmitter('moving ' + length + ' left');
    });

    // moveRight event listener
    socket.on('moveRight', (length) => {
      __printer.moveRight(parseFloat(length));
      eventEmitter('moving ' + length + ' right');
    });

    // moveForward event listener
    socket.on('moveForward', (length) => {
      __printer.moveForward(parseFloat(length));
      eventEmitter('moving ' + length + ' forward');
    });

    // moveBack event listener
    socket.on('moveBack', (length) => {
      __printer.moveBack(parseFloat(length));
      eventEmitter('moving ' + length + ' back');
    });

    // moveUp event listener
    socket.on('moveUp', (length) => {
      __printer.moveUp(parseFloat(length));
      eventEmitter('moving ' + length + ' up');
    });

    // moveDown event listener
    socket.on('moveDown', (length) => {
      __printer.moveDown(parseFloat(length));
      eventEmitter('moving ' + length + ' down');
    });

    // moveXYHome event listener
    socket.on('moveXYHome', () => {
      __printer.moveXYHome();
      eventEmitter('moving XY home');
    });

    // moveZHome event listener
    socket.on('moveZHome', () => {
      __printer.moveZHome();
      eventEmitter('moving Z home');
    });

    // fanOn event listener
    socket.on('fanOn', (speed) => {
      __printer.fanOn(parseInt(speed));
      eventEmitter('turning fan on with a speed of ' + speed);
    });

    // fanOff event listener
    socket.on('fanOff', () => {
      __printer.fanOff();
      eventEmitter('turning fan off');
    });

    // sendManualCommand event listener
    socket.on('sendManualCommand', (cmd) => {
      __printer.sendManualCommand(cmd);
      eventEmitter('sending: ' + cmd);
    });

    // extrude event listener
    socket.on('extrude', (length) => {
      __printer.extrude(parseFloat(length));
      eventEmitter('extruding ' + length);
    });

    // retract event listener
    socket.on('retract', (length) => {
      __printer.retract(parseFloat(length));
      eventEmitter('retracting ' + length);
    });

    // setHotendTemperature event listener
    socket.on('setHotendTemperature', (temp) => {
      __printer.setHotendTemperature(parseInt(temp));
      io.emit('temperature', __printer.getTemperature());
      eventEmitter('set hotend temperature to ' + temp);
    });

    // setHeatbedTemperature event listener
    socket.on('setHeatbedTemperature', (temp) => {
      __printer.setHeatbedTemperature(parseInt(temp));
      io.emit('temperature', __printer.getTemperature());
      eventEmitter('set heatbed temperature to ' + temp);
    });

    // loadFile event listener
    socket.on('loadFile', (file) => {
      io.emit('newFileToPrint', file);
    });

    // deleteLoadedFile event listener
    socket.on('deleteLoadedFile', () => {
      io.emit('deleteLoadedFile');
    });

    // getInfo event listener
    socket.on('getInfo', () => {
      io.emit('info', {
        status: __printer.getStatus(),
        progress: __printer.getProgress(),
        temperature: __printer.getTemperature()
      });
    });

  });

}