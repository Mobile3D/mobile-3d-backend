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

/**
 * Printer Class to symbolize the printer as an object
 * 
 * @param {string} port the port the printer is connected to
 * @param {int} baudRate the baud rate the printer runs at
 * 
 * @prop {object} serial parameter for the serial port object
 * @prop {boolean} ready if the printer is currently printing or ready
 * @prop {array} queue the queue with all commands of a g-code file seperated by '\n'
 * @prop {boolean} busy if the api is currently sending a command to the printer
 * @prop {boolean} stopped if the printer should stop printing
 * @prop {object} current the current command in the queue
 * @prop {object} queueCallback parameter for callback function of setProcessQueueCallback()
 * @prop {int} queueBufferSize the buffer size of the printers microcontroller
 * @prop {int} queueBufferChunkSize the buffer chunk size of the printers microcontroller
 * @prop {int} lineNumber the number of processable lines a file has
 * @prop {int} lineCount the number of lines that have been processed
 */
function Printer(port, baudRate) {

  // initialize properties
  // create a new serial connection with serialport
  this.serial = new SerialPort(port, {
    baudRate: baudRate
  });
  this.ready = false;
  this.queue = [];
  this.busy = false;
  this.stopped = false;
  this.current = null;
  this.queueCallback = null;
  this.queueBufferSize = 20;
  this.queueBufferChunkSize = 10;
  this.lineNumber = 0;
  this.lineCount = 0;

  let self = this;
  // initialize a parser and pipe it with readline
  const parser = this.serial.pipe(new Readline({ delimiter: '\n' }));

  // if the printer sends data
  // is triggered after every command sent to the microcontroller
  parser.on('data', function (data) {
    // convert data to string
    em.emit('log', data.toString());
    // if there is no current command, go back
    if (!self.current) return; 
    // if there is a current command and data is 'ok'
    else if (data.toString() === 'ok') {

      if (self.isStopped()) {
        em.emit('status', 'stopped');
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
    setTimeout(() => {
      // get firmware information of marlinFW
      this.send('M115');
      this.ready = true;
      em.emit('status', 'ready');
    }, 5000);
  });

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
  if (!this.stopped) {
  
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
Printer.prototype.printFile = function (file) {

  // log
  em.emit('status', 'printing');
  this.ready = false;

  // get lines of the file
  let lines = new lineByLine(file);
  let l;
 
  while (l = lines.next()) {
    if(l.toString('ascii').charAt(0) !== ';') this.lineNumber++;
  }

  lines = new lineByLine(file);

  // set a callback function
  this.setProcessQueueCallback(() => {
      
    // queue must be smaller than the queue buffer chunk size
    if (this.queue.length < this.queueBufferChunkSize) {

      // log
      em.emit('log', 'Reloading the queue...');

      // as long as queue is smaller than the buffer size
      for (let count = 0; this.queue.length < this.queueBufferSize; count++) {

        // get a single line
        let line = lines.next().toString('ascii');
        let cmt = null;
        
        // if there is no more line
        if (line === 'false') {
          // log
          em.emit('log', 'File completed');
          em.emit('status', 'completed');
          this.reset();
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

        this.lineCount++;
        
        if (this.queue.length === this.queueBufferChunkSize - 1 || this.lineCount === this.lineNumber) {
          em.emit('progress', { sent: this.lineCount, total: this.lineNumber });
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

  em.emit('status', 'ready');
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
}

/**
 * Function for moving the printer arm to the right
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveRight = function (length) {
  this.send('G91');
  this.send('G1 X' + length);
}

/**
 * Function for moving the printer arm forward
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveForward = function (length) {
  this.send('G91');
  this.send('G1 Y' + length);
}

/**
 * Function for moving the printer arm back
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveBack = function (length) {
  this.send('G91');
  this.send('G1 Y' + length * (-1));
}

/**
 * Function for moving the printer arm up
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveUp = function (length) {
  this.send('G91');
  this.send('G1 Z' + length);
}

/**
 * Function for moving the printer arm down
 * 
 * @param {float} length the length the printer should move
 */
Printer.prototype.moveDown = function (length) {
  this.send('G91');
  this.send('G1 Z' + length * (-1));
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
 * Function for extruding the ??? 
 */
Printer.prototype.extrude = function () {
  
}

/** 
 * Function for retracting the ??? 
 */
Printer.prototype.retract = function () {
  
}

/** 
 * Function for stopping the printer
 */
Printer.prototype.stop = function () {
  this.stopped = true;
  em.emit('status', 'stopping');
}

// export the event emitter
Printer.prototype.emitter = em;

module.exports = Printer;


