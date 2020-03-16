// required node packages
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const events = require('events');
const em = new events.EventEmitter();
const lineByLine = require('n-readlines');

// add listener for printing progress, status and log
em.addListener('log', function () {});
em.addListener('progress', function () {});
em.addListener('status', function () {});
em.addListener('temperature', function () {});

/**
 * Printer Class to symbolize the printer as an object
 * 
 * @param {string} port the port the printer is connected to
 * @param {int} baudRate the baud rate the printer runs at
 * 
 * @prop {object} serial parameter for the serial port object
 * @prop {boolean} ready if the printer is currently printing or ready
 * @prop {boolean} connected if the printer is connected
 * @prop {array} queue the queue with all commands of a g-code file seperated by '\n'
 * @prop {boolean} busy if the api is currently sending a command to the printer
 * @prop {string} status the current status of the printer
 * @prop {boolean} stopped if the printer should stop printing
 * @prop {boolean} paused if the printer should pause printing
 * @prop {object} current the current command in the queue
 * @prop {object} queueCallback parameter for callback function of setProcessQueueCallback()
 * @prop {int} queueBufferSize the buffer size of the printers microcontroller
 * @prop {int} queueBufferChunkSize the buffer chunk size of the printers microcontroller
 * @prop {int} lineNumber the number of processable lines a file has
 * @prop {int} lineCount the number of lines that have been processed
 * @prop {object} progress the printing progress of the current file
 * @prop {object} hotendTemp the current and set temperature of the hotend
 * @prop {object} heatbedTemp the current and set temperature of the heatbed
 */
function Printer(port, baudRate) {

  // initialize properties
  // create a new serial connection with serialport
  this.serial = new SerialPort(port, {
    baudRate: baudRate
  });
  this.ready = false;
  this.connected = false;
  this.queue = [];
  this.busy = false;
  this.status = 'disconnected';
  this.stopped = false;
  this.paused = false;
  this.current = null;
  this.queueCallback = null;
  this.queueBufferSize = 20;
  this.queueBufferChunkSize = 10;
  this.lineNumber = 0;
  this.lineCount = 0;
  this.progress = { sent: 0, total: 1 };
  this.hotendTemp = { current: 0, set: 0 };
  this.heatbedTemp = { current: 0, set: 0 };

  this.valid = this.status === 'ready' || this.status === 'paused';

  let self = this;
  // initialize a parser and pipe it with readline
  const parser = this.serial.pipe(new Readline({ delimiter: '\n' }));

  // if the printer sends data
  // is triggered after every command sent to the microcontroller
  parser.on('data', function (data) {
    
    // convert data to string if it does not contain busy or temperature responses
    if (!data.toString().includes('busy') && data.toString().match(/T:[0-9]{1,3}\.[0-9]{1,2}/g) === null) {
      em.emit('log', data.toString());
    }

    // extract temperature data from string
    let partHotend = [data.toString().match(/T:[0-9]{1,3}\.[0-9]{1,2} \/[0-9]{1,3}\.[0-9]{1,2}/g), data.toString().match(/T:[0-9]{1,3}\.[0-9]{1,2}/g)];
    let partHeatbed = [data.toString().match(/B:[0-9]{1,3}\.[0-9]{1,2} \/[0-9]{1,3}\.[0-9]{1,2}/g), data.toString().match(/B:[0-9]{1,3}\.[0-9]{1,2}/g)];

    // check if the set temperature has been sent
    if (partHotend[0] !== null && partHeatbed[0] !== null) {

      // set the set temperature
      self.hotendTemp.set = parseInt(partHotend[0].toString().split('/')[1]);
      self.heatbedTemp.set = parseInt(partHeatbed[0].toString().split('/')[1]);

      // set the current temperature
      self.hotendTemp.current = parseInt(partHotend[1].toString().split(':')[1]);
      self.heatbedTemp.current = parseInt(partHeatbed[1].toString().split(':')[1]);

      // emit the new temperature
      em.emit('temperature', {
        hotend: self.hotendTemp,
        heatbed: self.heatbedTemp
      });

    } else if (partHotend[1] !== null && partHeatbed[1] !== null) {

      // set the current temperature
      self.hotendTemp.current = parseInt(partHotend[1].toString().split(':')[1]);
      self.heatbedTemp.current = parseInt(partHeatbed[1].toString().split(':')[1]);

      // emit the new temperature
      em.emit('temperature', {
        hotend: self.hotendTemp,
        heatbed: self.heatbedTemp
      });
    }

    // if there is no current command, go back
    if (!self.current) return; 
    // if there is a current command and data is 'ok'
    else if (data.toString() === 'ok') {
      
      if (self.paused) {
        self.status = 'paused';
        self.emitStatus();
      }

      if (self.isStopped()) {
        self.reset();
      }

      self.current = null;
      // work off the queue
      self.processQueue();
    }
  });

  // when the microcontroller has successfully opened the port
  this.serial.on('open', () => {
    // log
    em.emit('log', 'Port open');
    this.status = 'connecting';
    this.emitStatus();
    setTimeout(() => {

      // get firmware information of marlinFW
      this.send('M115');
      this.send('M155 S2');
      this.ready = true;
      this.connected = true;
      this.status = 'ready';
      this.emitStatus();

    }, 5000);
  });

  this.serial.on('close', () => {
    this.ready = false;
    this.connected = false;
    this.status = 'disconnected';
    this.emitStatus();
  })

}

// Prototype functions of the Printer Class

/**
 * Function for checking, if the printer is ready
 * 
 * @returns {boolean}
 */
Printer.prototype.isReady = function () {
  return this.ready;
}

/**
 * Function for checking, if the printer is connected
 * 
 * @returns {boolean}
 */
Printer.prototype.isConnected = function () {
  return this.connected;
}

/**
 * Function for checking, if the printer is busy
 * 
 * @returns {boolean}
 */
Printer.prototype.isBusy = function () {
  return this.busy;
}

/**
 * Function for checking, if the printer has been stopped
 * 
 * @returns {boolean}
 */
Printer.prototype.isStopped = function () {
  return this.stopped;
}

/**
 * Function for checking, if the printer has been paused
 * 
 * @returns {boolean}
 */
Printer.prototype.isPaused = function () {
  return this.paused;
}

/** 
 * Function for getting the progress of the file printed
 * 
 * @returns {object} lineCount and lineNumber
 */
Printer.prototype.getProgress = function () {
  return {
    sent: this.lineCount,
    total: this.lineNumber
  };
}

/**
 * Function to add a command to the queue and send it to the printer
 * 
 * @param {string} cmd command that should be sent
 * @param {string} cmt comment of the command
 */
Printer.prototype.send = function (cmd, cmt) {
  // add the command to the queue
  this.queue.push({ cmd, cmt });
  // if a command is running, go back
  if (this.busy) return;
  this.busy = true;
  // work off the queue
  this.processQueue();
}

/**
 * Function to set the callback function of the process queue
 * 
 * @param {object} callback callback function
 */
Printer.prototype.setProcessQueueCallback = function (callback) {
  this.queueCallback = callback;
}

/**
 * Function to work off the queue
 */
Printer.prototype.processQueue = function () {

  // only if the printer is not stopped
  if (!this.stopped && !this.paused) {
  
    // get the next command in the queue
    let next = this.queue.shift();
    // if there is no next object
    if (!next) {
        this.busy = false;
        // if there is a callback function, execute it
        if (this.queueCallback) this.queueCallback();
        return;
    }

    // set next command to current
    this.current = next;
    // log
    em.emit('log', next.cmd + (next.cmt ? ` ;${next.cmt}` : ''));
    this.progress = { sent: this.lineCount, total: this.lineNumber };
    em.emit('progress', { sent: this.lineCount, total: this.lineNumber });

    if ((this.lineCount === this.lineNumber) && this.status === 'printing') {
      this.status = 'completed';
      this.emitStatus();
      this.reset();
    }

    this.lineCount++;

    // send the command to the printer
    this.serial.write(`${next.cmd}\n`);

    // if there is a callack, execute it
    if (this.queueCallback) this.queueCallback();

  }

}

/**
 * Function for printing a file that has been uploaded
 * This function is called from the api or the socket connection
 * 
 * @param {object} file the g-code file
 */
Printer.prototype.printFile = function (file, lineToGo = 0) {

  // log
  this.status = 'printing';
  this.emitStatus();
  this.ready = false;

  // get lines of the file
  let lines = new lineByLine(file);
  let l;
 
  while (l = lines.next()) {
    if(l.toString('ascii').charAt(0) !== ';') this.lineNumber++;
  }

  lines = new lineByLine(file);

  // if the printer unpauses from a certain state
  if (lineToGo > 0) {
    for (let i = 0; i < lineToGo; i++) {
      l = lines.next();
      if(l.toString('ascii').charAt(0) === ';') i--;
      else this.lineCount++;
    }
    // somehow i need that... otherwise it would not finish after pausing
    this.lineCount++;
  }

  // set a callback function
  this.setProcessQueueCallback(() => {
      
    // queue must be smaller than the queue buffer chunk size
    if (this.queue.length < this.queueBufferChunkSize) {

      // as long as queue is smaller than the buffer size
      for (let count = 0; this.queue.length < this.queueBufferSize; count++) {

        // get a single line
        let line = lines.next().toString('ascii');
        let cmt = null;
        
        // if there is no more line
        if (line === 'false') {
          // set null as callback
          this.setProcessQueueCallback(null);
          return;
        }

        // if line has a semikolon, there is a comment in it
        if (line.includes(';')) {
          const parts = line.split(';');
          line = parts[0];
          cmt = parts[1];
        }

        // if line is false or if there is only a space in line, go on
        if (!line || line === 'false' || !line.replace(/\s/g, '').length) {
          continue;
        }
        
        if (this.queue.length === this.queueBufferChunkSize - 1 || this.lineCount === this.lineNumber) {
          // em.emit('progress', { sent: this.lineCount, total: this.lineNumber });
          // this.progress = { sent: this.lineCount, total: this.lineNumber };
        }
    
        // if everything is fine, send the line
        this.send(line, cmt);

      }
    }

  });
  
  // work off the queue
  this.processQueue();
}

/**
 * Function for setting all parameters to their default values
 */
Printer.prototype.reset = function () {
  this.ready = true;
  this.queue = [];
  this.busy = false;
  this.stopped = false;
  this.current = null;
  this.queueCallback = null;
  this.lineNumber = 0;
  this.lineCount = 0;
  this.progress = { sent: 0, total: 1 };
  this.hotendTemp = { current: 0, set: 0 };
  this.heatbedTemp = { current: 0, set: 0 };

  if (!this.paused) {
    this.status = 'ready';
    this.emitStatus();
  }

  this.paused = false;

}

/**
 * Function for taking the printer to its XY home position
 */
Printer.prototype.moveXYHome = function () {
  this.send('G28 X0 Y0');
}

/**
 * Function for taking the printer to its Z home position
 */
Printer.prototype.moveZHome = function () {
  this.send('G28 Z0');
}

/**
 * Function for moving the printer arm to the left
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveLeft = function (length) {
  this.send('G91');
  this.send('G1 X' + length * (-1));
  this.send('G90');
}

/**
 * Function for moving the printer arm to the right
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveRight = function (length) {
  this.send('G91');
  this.send('G1 X' + length);
  this.send('G90');
}

/**
 * Function for moving the printer arm forward
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveForward = function (length) {
  this.send('G91');
  this.send('G1 Y' + length);
  this.send('G90');
}

/**
 * Function for moving the printer arm back
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveBack = function (length) {
  this.send('G91');
  this.send('G1 Y' + length * (-1));
  this.send('G90');
}

/**
 * Function for moving the printer arm up
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveUp = function (length) {
  this.send('G91');
  this.send('G1 Z' + length);
  this.send('G90');
}

/**
 * Function for moving the printer arm down
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveDown = function (length) {
  this.send('G91');
  this.send('G1 Z' + length * (-1));
  this.send('G90');
}

/**
 * Function for turning the fan to a specific speed level
 * 
 * @param {int} speed the fan speed
 */
Printer.prototype.fanOn = function (speed) {
  this.send('M106 S' + speed);
}

/**
 * Function for turning off the fan
 */
Printer.prototype.fanOff = function () {
  this.send('M107');
}

/**
 * Function for sending a custom command to the printer
 * 
 * @param {string} cmd the command to send
 */
Printer.prototype.sendManualCommand = function (cmd) {
  this.send(cmd);
}

/** 
 * Function for extruding the E-Axis
 * 
 * @param {float} length the length to extrude
 */
Printer.prototype.extrude = function (length) {
  this.send('G1 E' + length);
}

/** 
 * Function for retracting the E-Axis
 * 
 * @param {float} length the length to retract
 */
Printer.prototype.retract = function (length) {
  this.send('G1 E' + length * (-1));
}

/**
 * Function for setting the hotend temperature
 * 
 * @param {int} temp the temperature to set
 */
Printer.prototype.setHotendTemperature = function (temp) {
  this.hotendTemp.set = temp;
  this.send('M104 S' + temp);
}

/**
 * Function for setting the heatbed-temperature
 * 
 * @param {int} temp the temperature to set
 */
Printer.prototype.setHeatbedTemperature = function (temp) {
  this.heatbedTemp.set = temp;
  this.send('M140 S' + temp);
}

/** 
 * Function for stopping the printer
 */
Printer.prototype.stop = function () {
  if (this.status === 'printing') {
    this.stopped = true;
    this.status = 'stopping';
    this.emitStatus();
  }
}

/** 
 * Function for pausing the printer
 */
Printer.prototype.pause = function () {
  if (this.status === 'printing') {
    this.paused = true;
    this.status = 'pausing';
    this.emitStatus();
  }
}

/**
 * Function for upausing the printer
 */
Printer.prototype.unpause = function () {
  if (this.status === 'paused') this.reset();
}

/** 
 * Function for emitting the status of the printer
 */
Printer.prototype.emitStatus = function () {
  em.emit('status', this.status);
}

/**
 * Function for getting the line count of the currently printed file
 */
Printer.prototype.getLineCount = function () {
  return this.lineCount;
}

/** 
 * Function for getting the current status of the printer
 */
Printer.prototype.getStatus = function () {
  return this.status;
}

/** 
 * Function for getting the printing progress
 */
Printer.prototype.getProgress = function () {
  return this.progress.total !== 0 ? this.progress : {sent: 0, total: 1};
}

/** 
 * Function for getting the temperatures
 */
Printer.prototype.getTemperature = function () {
  return {
    hotend: this.hotendTemp,
    heatbed: this.heatbedTemp
  };
}

// export the event emitter
Printer.prototype.emitter = em;

module.exports = Printer;


