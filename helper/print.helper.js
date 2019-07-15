const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const serialLog = require('debug')('marlinjs:serial-rx')
const log = require('debug')('marlinjs:log');
const serialWriteLog = require('debug')('marlinjs:serial-tx');

let fgets = require('n-readlines');

function Printer(port, baudRate) {

  this.serial = new SerialPort(port, {
    baudRate: baudRate
  });
  this.ready = false;
  this.queue = [];
  this.busy = false;
  this.current = null;
  this.queueCallback = null;
  this.queueBufferSize = 20;
  this.queueBufferChunkSize = 10;

  let printer = this;
  const parser = this.serial.pipe(new Readline({ delimiter: '\n' }));

  parser.on('data', function (data) {
    serialLog(data.toString());

    if (!printer.current) return;
    if (data.toString() === 'ok') {
      printer.current = null;
      printer.processQueue();
    }
  });

  this.serial.on('open', () => {
    log('Port Open.');
    setTimeout(() => {
      this.send('M115');
      this.ready = true;
    }, 5000);
  });

}

Printer.prototype.isReady = function () {
  return this.ready;
}

Printer.prototype.send = function (cmd, cmt) {
  this.queue.push({ cmd, cmt });
  if (this.busy) return;
  this.busy = true;
  this.processQueue();
}

Printer.prototype.setProcessQueueCallback = function (callback) {
  this.queueCallback = callback;
}

Printer.prototype.processQueue = function () {
  var next = this.queue.shift();
  if (!next) {
      this.busy = false;
      if (this.queueCallback) this.queueCallback();
      return;
  }
  this.current = next;
  serialWriteLog(next.command + (next.comment ? ` ;${next.comment}` : ''));
  this.serial.write(`${next.command}\n`);
  if (this.queueCallback) this.queueCallback();
}


Printer.prototype.printFile = function (file) {

  log('Printing');
  let lines = new fgets(file);

  this.setProcessQueueCallback(() => {
    
    if (this.queue.length < this.queueBufferChunkSize) {

      log('Reloading the queue...');

      for (let count = 0; this.queue.length < this.queueBufferSize; count++) {
        let line = lines.next().toString('ascii');
        let cmt = null;
        
        if (line === 'false') {
          log('File completed');
          this.setProcessQueueCallback(null);
          return;
        }

        if (line.includes(';')) {
          const parts = line.split(';');
          line = parts[0];
          cmt = parts[1];
        }

        if (!line || line === 'false' || !line.replace(/\s/g, '').length) {
          continue;
        }

        this.send(line, cmt);

      }
    }

  });
  this.processQueue();
}

module.exports = Printer;

