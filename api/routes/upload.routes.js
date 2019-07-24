/**
 * All routes of the upload object for the api
 */
module.exports = function (app) {
  // required node packages
  const multer = require('multer');
  const uuid = require('uuid/v1');
  const upload = require('../controllers/upload.controller');
  const user = require('../controllers/user.controller');

  // create a storage for file uploads
  const storage = multer.diskStorage({
    // set destination to files/
    destination: function (req, file, cb) {
      cb(null, 'files');
    },
    // set filename to an uuid timestamp
    filename: function (req, file, cb) {
      let parts = file.originalname.split('.');
      cb(null, uuid() + '.' + parts[parts.length - 1].toLowerCase());
    }
  });

  // create multer upload object
  const mUpload = multer({
    storage: storage
  });

  app.route('/api/v1/uploads')
    .get(user.protected, upload.getAll)
    .post(user.protected, mUpload.single('file'), upload.add);

  app.route('/api/v1/uploads/:upload_id')
    .get(user.protected, upload.get)
    .delete(user.protected, upload.delete);

}