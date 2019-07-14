// required node packages
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const userHelper = require('../../helper/user.helper');

/**
 * Function for registering a new user to the application
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node result parameter
 * 
 * @returns {object} error message or the new user
 */
exports.register = function (req, res) {

  // check if all required parameters are given
  if (req.body.username === undefined ||
      req.body.password === undefined ||
      req.body.firstname === undefined ||
      req.body.lastname === undefined) {
      
      return res.status(400).json({
        error: {
          code: 'ER_MISSING_PARAMS',
          message: 'ER_MISSING_PARAMS: Registering failed. Required parameters: username, password, firstname, lastname'
        }
      });

  }

  // create a new user object
  let newUser = {
    username: req.body.username,
    password: bcryptjs.hashSync(req.body.password, 10),
    fistname: req.body.firstname,
    lastname: req.body.lastname,
    admin: true,
    disabled: false,
    created_at: Date.now()
  };

  // read the user file
  fs.readFile(__basedir + '/data/users.json', 'utf8', function (err, data) {

    // error reading the file
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    // make js objects out of the json string and check if the user already exists
    let users = JSON.parse(data);
    let user = userHelper.findUser(newUser.username, users);

    // if the user exists return error
    if (user) {
      return res.status(400).json({
        error: {
          code: 'ER_USERNAME_TAKEN',
          message: 'ER_USERNAME_TAKEN: the username is already taken.'
        }
      });
    }

    // get the highest id in the file and give the new user the highest + 1
    newUser._id = userHelper.getHighestId(users) + 1;
    // add the user to the array
    users.push(newUser);  
    // write the file
    fs.writeFile(__basedir + '/data/users.json', JSON.stringify(users), function(err) {
      
      // writing error
      if (err) {
        return res.status(500).json({
          error: {
            code: 'ER_INTERNAL',
            message: err.message
          }
        });
      }

      // hide password from output
      newUser.password = undefined;
      // return user object
      return res.status(200).json(newUser);
    });

  });

}

/**
 * Function for signing in the user to authenticate 
 * and get access to the client application
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node result parameter
 * 
 * @returns {object} error or a signed jwt
 */
exports.login = function (req, res) {

  // check if all required parameters are given
  if (req.body.username === undefined ||
      req.body.password === undefined) {
      
      return res.status(400).json({
        error: {
          code: 'ER_MISSING_PARAMS', 
          message: 'ER_MISSING_PARAMS: Authentication failed. Required parameters: username, password'
        }
      });
        
  }

  // read the user file
  fs.readFile(__basedir + '/data/users.json', 'utf8', function (err, data) {

    // error while reading
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    // parse json string to js object and find the user
    let users = JSON.parse(data);
    let user = userHelper.findUser(req.body.username, users);

    // check if user exists and if password matches
    if (!user || !bcryptjs.compareSync(req.body.password, user.password)) {
      return res.status(401).json({
        error: {
          code: 'ER_INVALID_LOGIN',
          message: 'ER_INVALID_LOGIN: Authentication failed. Invalid username or password.'
        }
      });
    }

    // return a signed jwt
    return res.json({
      token: jwt.sign({
        _id: user._id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        admin: user.admin,
        timestamp: user.timestamp
      }, '965b41674c2940ab946dc0612f4dbc2bf9e2162beefd8037c27c92abf0ad72aa', {expiresIn: 86400})
    });

  });

}

/**
 * Function for protecting routes against unauthorized access
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node result parameter
 */
exports.protected = function (req, res, next) {

  // check if req.user is given
  if (req.user) {
    // move on the the next function
    next();
  } else {
    // throw unauthorized error
    return res.status(401).json({
      error: {
        code: 'ER_UNAUTHORIZED',
        message: 'ER_UNAUTHORIZED: This route is protected.'
      }
    });
  }

};

/**
 * Function to get the current user with its token
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node result parameter
 * 
 * @returns {object} error or the corresponding user
 */
exports.lookup = function (req, res) {

  // read the users file
  fs.readFile(__basedir + '/data/users.json', 'utf8', function (err, data) {
    
    // error while reading
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    // parse json string to js object and find the user
    let users = JSON.parse(data);
    let user = userHelper.findUser(req.user.username, users);

    // hide password from output
    user.password = undefined;
    // return the user as json object
    return res.status(200).json(user);
  });

};