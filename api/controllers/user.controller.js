const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const userHelper = require('../../helper/user.helper');

exports.register = function (req, res) {

  if (req.body.username === undefined ||
      req.body.password === undefined) {
      
      return res.status(400).json({
        error: {
          code: 'ER_MISSING_PARAMS',
          message: 'ER_MISSING_PARAMS: Registering failed. Required parameters: username, password'
        }
      });

  }

  let newUser = {
    username: req.body.username,
    password: bcryptjs.hashSync(req.body.password, 10),
    admin: true,
    disabled: false,
    created_at: Date.now()
  };

  fs.readFile(__basedir + '/data/users.json', 'utf8', function (err, data) {

    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    let users = JSON.parse(data);
    let user = userHelper.findUser(newUser.username, users);

    if (user) {
      return res.status(400).json({
        error: {
          code: 'ER_USERNAME_TAKEN',
          message: 'ER_USERNAME_TAKEN: the username is already taken.'
        }
      });
    }

    newUser._id = userHelper.getHighestId(users) + 1;
    users.push(newUser);  
    fs.writeFile(__basedir + '/data/users.json', JSON.stringify(users), function(err) {
      
      if (err) {
        return res.status(500).json({
          error: {
            code: 'ER_INTERNAL',
            message: err.message
          }
        });
      }

      newUser.password = undefined;
      return res.status(200).json(newUser);
    });

  });

}

exports.login = function (req, res) {

  if (req.body.username === undefined ||
      req.body.password === undefined) {
      
      return res.status(400).json({
        error: {
          code: 'ER_MISSING_PARAMS', 
          message: 'ER_MISSING_PARAMS: Authentication failed. Required parameters: username, password'
        }
      });
        
  }

  fs.readFile(__basedir + '/data/users.json', 'utf8', function (err, data) {

    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    let users = JSON.parse(data);
    let user = userHelper.findUser(req.body.username, users);

    if (!user || !bcryptjs.compareSync(req.body.password, user.password)) {
      return res.status(401).json({
        error: {
          code: 'ER_INVALID_LOGIN',
          message: 'ER_INVALID_LOGIN: Authentication failed. Invalid username or password.'
        }
      });
    }

    return res.json({
      token: jwt.sign({
        _id: user._id,
        username: user.username,
        admin: user.admin,
        timestamp: user.timestamp
      }, '965b41674c2940ab946dc0612f4dbc2bf9e2162beefd8037c27c92abf0ad72aa', {expiresIn: 86400})
    });

  });

}

exports.protected = function (req, res, next) {

  if (req.user) {
    next();
  } else {
    return res.status(401).json({
      error: {
        code: 'ER_UNAUTHORIZED',
        message: 'ER_UNAUTHORIZED: This route is protected.'
      }
    });
  }

};

exports.lookup = function (req, res) {

  fs.readFile(__basedir + '/data/users.json', 'utf8', function (err, data) {
    
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    let users = JSON.parse(data);
    let user = userHelper.findUser(req.user.username, users);

    user.password = undefined;
    return res.status(200).json(user);
  });

};