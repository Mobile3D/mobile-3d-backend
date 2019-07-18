// required node packages
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const events = require('events');
const em = new events.EventEmitter();
// just for debugging purposes
const serialLog = require('debug')('marlinjs:serial-rx')
const log = require('debug')('marlinjs:log');
const serialWriteLog = require('debug')('marlinjs:serial-tx');
const lineByLine = require('n-readlines');

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
 * @prop {boolean} paused if the printer should pause printing
 * @prop {boolean} stopped if the printer should stop printing
 * @prop {object} current the current command in the queue
 * @prop {object} queueCallback parameter for callback function of setProcessQueueCallback()
 * @prop {int} queueBufferSize the buffer size of the printers microcontroller
 * @prop {int} queueBufferChunkSize the buffer chunk size of the printers microcontroller
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
  this.paused = false;
  this.stopped = false;
  this.current = null;
  this.queueCallback = null;
  this.queueBufferSize = 20;
  this.queueBufferChunkSize = 10;

  let self = this;
  // initialize a parser and pipe it with readline
  const parser = this.serial.pipe(new Readline({ delimiter: '\n' }));

  // if the printer sends data
  // is triggered after every command sent to the microcontroller
  parser.on('data', function (data) {
    // convert data to string
    serialLog(data.toString());
    // if there is no current command, go back
    if (!self.current) return; 
    // if there is a current command and data is 'ok'
    else if (data.toString() === 'ok') {
      self.current = null;
      // work off the queue
      self.processQueue();
    }
  });

  // when the microcontroller has successfully opened the port
  this.serial.on('open', () => {
    // log
    log('Port open.');
    setTimeout(() => {
      // get firmware information of marlinFW
      this.send('M115');
      this.ready = true;
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
  serialWriteLog(next.cmd + (next.cmt ? ` ;${next.cmt}` : ''));

  // send the command to the printer
  this.serial.write(`${next.cmd}\n`);

  // if there is a callack, execute it
  if (this.queueCallback) this.queueCallback();

}

/**
 * Function for printing a file that has been uploaded
 * This function is called from the api or the socket connection
 * 
 * @param {object} file the g-code file
 */
Printer.prototype.printFile = function (file) {

  // add listener for printing progress
  em.addListener('progress', function () {});

  // log
  log('Printing');

  // get lines of the file
  let lines = new lineByLine(file);

  let line;
  let lineNumber = 0;
  let lineCount = 0;
 
  while (line = lines.next()) {
    lineNumber++;
  }

  lines.reset();

  // set a callback function
  this.setProcessQueueCallback(() => {
    
    // queue must be smaller than the queue buffer chunk size
    if (this.queue.length < this.queueBufferChunkSize) {

      // log
      log('Reloading the queue...');

      // as long as queue is smaller than the buffer size
      for (let count = 0; this.queue.length < this.queueBufferSize; count++) {

        // get a single line
        let line = lines.next().toString('ascii');
        let cmt = null;
        
        // if there is no more line
        if (line === 'false') {
          // log
          log('File completed');
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

        // if everything is fine, send the line
        this.send(line, cmt);
        lineCount++;

      }
    }

  });

  em.emit('progress', lineCount / lineNumber);
  
  // work off the queue
  this.processQueue();
}

// export the event emitter
Printer.prototype.emitter = em;

module.exports = Printer;


