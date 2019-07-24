// required node packages
const fs = require('fs');
const arrayHelper = require('../../helper/array.helper');

/**
 * Function for uploading files to the files/ directory
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} error or the successfully uploaded file
 */
exports.add = function (req, res) {
  
  // check if required parameters are given
  if (req.file === undefined) {
    return res.status(400).json({
      error: {
        code: 'ER_MISSING_PARAMS',
        message: 'ER_MISSING_PARAMS: Some parameters are missing. Required parameters: file'
      }
    });
  }

  // create a new upload object
  let newUpload = {
    name: req.file.originalname.split('.')[0],
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype,
    created_at: Date.now()
  }

  // read the uploads file
  fs.readFile(__basedir + '/data/uploads.json', 'utf8', function (err, data) {
    
    // error reading the file
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    // make js objects out of the json string
    let uploads = JSON.parse(data);

    // get highest id of the entries in the uploads.json file
    newUpload._id = arrayHelper.getHighestId(uploads) + 1;
    // add the object to the array
    uploads.push(newUpload);

    // write the file
    fs.writeFile(__basedir + '/data/uploads.json', JSON.stringify(uploads), function (err) {
      
      // writing error
      if (err) {
        return res.status(500).json({
          error: {
            code: 'ER_INTERNAL',
            message: err.message
          }
        });
      }

      // return file object
      return res.status(201).json(newUpload);

    });

  });

}

/**
 * Function for getting uploads
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} error or the uploads array
 */
exports.getAll = function (req, res) {

  // read the file
  fs.readFile(__basedir + '/data/uploads.json', 'utf8', function (err, data) {
    
    // error reading the file
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    // return the array
    return res.json(JSON.parse(data));    

  });

}

/** 
 * Function for getting a specific upload by id
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} error or the found upload
 */
exports.get = function (req, res) {

  fs.readFile(__basedir + '/data/uploads.json', 'utf8', function (err, data) {
    
    // error reading the file
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    // convert string to object
    let uploads = JSON.parse(data);
    let upload = arrayHelper.findById(parseInt(req.params.upload_id), uploads);
    
    // if upload has not been found
    if (!upload) {
      return res.status(404).json({
        error: {
          code: 'ER_UPLOAD_NOT_FOUND',
          message: 'ER_UPLOAD_NOT_FOUND: There is no upload with this id.'
        }
      });
    }

    return res.json(upload);

  });

}

/**
 * Function for deleting a specific upload by id
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} error or success
 */
exports.delete = function (req, res) {

  // read uploads file
  fs.readFile(__basedir + '/data/uploads.json', 'utf8', function (err, data) {
    
    // error reading the file
    if (err) {
      return res.status(500).json({
        error: {
          code: 'ER_INTERNAL',
          message: err.message
        }
      });
    }

    // convert string to object
    let uploads = JSON.parse(data);
    let upload = arrayHelper.findById(parseInt(req.params.upload_id), uploads);
    
    // if delete is not successfull
    if (!arrayHelper.delete(parseInt(req.params.upload_id), uploads)) {
      return res.status(404).json({
        error: {
          code: 'ER_UPLOAD_NOT_FOUND',
          message: 'ER_UPLOAD_NOT_FOUND: There is no upload with this id.'
        }
      });
    }

    // delete the file
    fs.unlinkSync(__basedir + '/files/' + upload.filename);

    // write the file
    fs.writeFile(__basedir + '/data/uploads.json', JSON.stringify(uploads), function (err) {
      
      // writing error
      if (err) {
        return res.status(500).json({
          error: {
            code: 'ER_INTERNAL',
            message: err.message
          }
        });
      }

      // return success message
      return res.json({
        success: {
          code: 'OK_DELETED',
          message: 'OK_DELETED: entry successfully deleted.'
        }
      });

    });

  });

}