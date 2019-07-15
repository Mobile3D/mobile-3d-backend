const fs = require('fs');
const uploadHelper = require('../../helper/upload.helper');

exports.add = function (req, res) {
  
  if (req.file === undefined) {
    return res.status(400).json({
      error: {
        code: 'ER_MISSING_PARAMS',
        message: 'ER_MISSING_PARAMS: Some parameters are missing. Required parameters: file'
      }
    });
  }

  let newUpload = {
    name: req.file.originalname.split('.')[0],
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype
  }

  // read the files file
  fs.readFile(__basedir + '/data/files.json', 'utf8', function (err, data) {
    
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
    let files = JSON.parse(data);

    newUpload._id = uploadHelper.getHighestId(files) + 1;
    files.push(newUpload);

    // write the file
    fs.writeFile(__basedir + '/data/files.json', JSON.stringify(files), function(err) {
      
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
      return res.status(200).json(newUpload);

    });

  });

}