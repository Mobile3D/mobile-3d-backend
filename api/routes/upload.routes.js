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

  const fileFilter = (req, file, cb) => {
    if (file.originalname.indexOf('.') !== -1) {
     
      let parts = file.originalname.split('.');
      let fileEnding = parts[parts.length - 1].toLowerCase();
      if(fileEnding === 'gcode' || fileEnding === 'gco' || fileEnding === 'gc' || fileEnding === 'g') {
        cb(null, true);
      } else {
        cb(null, false);
      }

    } else {
      cb(null, false);
    }
  };

  // create multer upload object
  const mUpload = multer({
    storage: storage,
    fileFilter: fileFilter
  });

  app.route('/api/v1/uploads')
    .get(user.protected, upload.getAll)
    .post(user.protected, mUpload.single('file'), upload.add);

  app.route('/api/v1/uploads/:upload_id')
    .get(user.protected, upload.get)
    .delete(user.protected, upload.delete);

}