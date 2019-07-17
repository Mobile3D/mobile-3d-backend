// required node packages
const jwt = require('jsonwebtoken');

/**
 * Function for finding a specific username in an array of users
 * If the user has been found, it returns the current user, otherwise false
 * 
 * @param {string} username the username to find
 * @param {array} users array of users
 * 
 * @returns {object}
 */
exports.findUser = function(username, users) {
  for(let i = 0; i < users.length; i++) {
    if(users[i].username === username) {
      return users[i];
    }
  }
  return false;
}

/**
 * Function to get the highest id of an array of users
 * 
 * @param {array} users an array of users
 * 
 * @returns {int} the highest id value
 */
exports.getHighestId = function (users) {

  if (users.length === 0) return 0;

  let ids = [];
  for(let i = 0; i < users.length; i++) {
    ids.push(users[i]._id);
  }
  return Math.max(...ids);
} 

/**
 * Function to check, if the jwt authorization token is valid or expired
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * @param {object} next the node next parameter
 */
exports.checkToken = function (req, res, next) {
  
  // check, if header is set and starts with "bearer"
  if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0].toLowerCase() === 'bearer') {
    
    // verify the token with jwt
    jwt.verify(req.headers.authorization.split(' ')[1], '965b41674c2940ab946dc0612f4dbc2bf9e2162beefd8037c27c92abf0ad72aa', function (err, decode) {
      
      // if an error occured, the token is expired
      if (err) {
        // req.user needs to be undefined
        req.user = undefined;
        // throw an error
        return res.status(401).json({
          error: {
            code: 'ER_TOKEN_EXPIRED',
            message: 'ER_TOKEN_EXPIRED: Token expired.'
          }
        });
      }

      // set the jwt to req.user and move on with next()
      req.user = decode;
      next();

    });

  } else {
    // req.user needs to be undefined, then move on with next()
    req.user = undefined;
    next();
  }
}