// required node packages
const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const io = require('socket.io')(http);
const rateLimit = require('express-rate-limit');
const config = require('./config')();
const userHelper = require('./helper/user.helper');
const apiHelper = require('./helper/api.helper');
const printerHelper = require('./helper/printer.helper');
const connectionHelper = require('./helper/connection.helper');

// port and root directory settings
global.__basedir = __dirname;
const port = process.env.PORT || __port;

// read connection details from file or take available connection and initialize a new 3D-Printer
connectionHelper.initConnection();
const connection = connectionHelper.getConnection();
global.__printer = new printerHelper(connection.port, parseInt(connection.baudrate));

// set api headers for protection against attacks and implement cors policy
app.use(helmet());
app.use(cors());

// request limit for all api routes (10 requests per second)
const apiLimiter = rateLimit({
  windowMs: 1 * 1000, // 1 second
  max: 10,
  message: {
    error: {
      code: 'ER_TOO_MANY_REQUESTS',
      message: 'ER_TOO_MANY_REQUESTS: Too many requests, please try again later.'
    }
  }
});

// request limit for login route (1 request in 5 seconds)
const loginLimiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 1,
  message: {
    error: {
      code: 'ER_TOO_MANY_REQUESTS',
      message: 'ER_TOO_MANY_REQUESTS: Too many requests, please try again later.'
    }
  }
});

// implement the check token function
app.use(userHelper.checkToken);

// set api limits to the corresponding routes
app.use('/api', apiLimiter);
app.use('/api/v1/auth/login', loginLimiter);

// configure body parser, to send json back to the client
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// set the /uploads directory to static
app.use('/files', express.static('./files'));

// implement api routes to the main application
const userRoutes = require('./api/routes/user.routes');
const uploadRoutes = require('./api/routes/upload.routes');
const printerRoutes = require('./api/routes/printer.routes');
const connectionRoutes = require('./api/routes/connection.routes');

userRoutes(app);
uploadRoutes(app);
printerRoutes(app);
connectionRoutes(app);

const printerSocket = require('./sockets/printer.socket');
printerSocket(io);

//app.use(apiHelper.checkRoute);

// implement the frontend
app.use(express.static(path.join(__dirname, 'web')));
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

// start the http server
http.listen(port);
console.log('Mobile3D Backend started on ' + __host + ':' + __port);