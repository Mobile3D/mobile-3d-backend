/**
 * Function to get the highest id of an array of files
 * 
 * @param {array} files an array of files
 * 
 * @returns {int} the highest id value
 */
exports.getHighestId = function (files) {

  if (files.length === 0) return 0;

  let ids = [];
  for(let i = 0; i < files.length; i++) {
    ids.push(files[i]._id);
  }
  return Math.max(...ids);
} 