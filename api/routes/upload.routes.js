module.exports = function (app) {
  const multer = require('multer');
  const uuid = require('uuid/v1');
  const upload = require('../controllers/upload.controller');
  const user = require('../controllers/user.controller');

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'files');
    },
    filename: function (req, file, cb) {
      let parts = file.originalname.split('.');
      cb(null, uuid() + '.' + parts[parts.length - 1].toLowerCase());
    }
  });

  const mUpload = multer({
    storage: storage
  });

  app.route('/v1/uploads')
    .get(user.protected)
    .post(user.protected, mUpload.single('file'), upload.add);

}