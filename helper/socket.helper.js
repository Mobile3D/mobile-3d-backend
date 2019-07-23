// required node packages
const jwt = require('jsonwebtoken');

/**
 * Function to check, if the jwt authorization token is valid or expired for sockets
 * research: https://stackoverflow.com/questions/36788831/authenticating-socket-io-connections
 * 
 * @param {object} socket the socket
 * @param {object} next the node next object
 */
exports.checkToken = function (socket, next) {

  if (socket.handshake.query && socket.handshake.query.token && socket.handshake.query.token.split(' ')[0].toLowerCase() === 'bearer') {

    jwt.verify(socket.handshake.query.token.split(' ')[1], '965b41674c2940ab946dc0612f4dbc2bf9e2162beefd8037c27c92abf0ad72aa', function (err, decoded) {
      if(err) return next(new Error('ER_TOKEN_EXPIRED'));
      socket.decoded = decoded;
      next();
    });

  } else {
      next(new Error('ER_AUTH_FAILED'));
  }   

}