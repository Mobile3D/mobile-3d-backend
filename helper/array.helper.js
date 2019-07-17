/**
 * Function to get the highest id of an array of objects
 * 
 * @param {array} arr an array
 * 
 * @returns {int} the highest id value
 */
exports.getHighestId = function (arr) {

  if (arr.length === 0) return 0;

  let ids = [];
  for (let i = 0; i < arr.length; i++) {
    ids.push(arr[i]._id);
  }
  return Math.max(...ids);
} 

/** 
 * Function for finding a value by id
 * 
 * @param {int} id id of the object
 * @param {array} arr array with objects
 * 
 * @returns {object} false or the found object
 */
exports.findById = function (id, arr) {
  return findById(id, arr);
}

/**
 * Function for deleting a object from an array
 * 
 * @param {int} id id of the object
 * @param {array} arr array with objects
 * 
 * @returns {boolean} true or false
 */
exports.delete = function (id, arr) {
  if (findById(id, arr)) {
    arr.splice(id - 1, 1);
    return true;
  }
  return false;
}

/** 
 * Function to find a value by id
 * 
 * @param {int} id id of the object
 * @param {array} arr array with objects
 * 
 * @returns {object} false or the found object
 */
function findById(id, arr) {
  for (let i=0; i < arr.length; i++) {
    if (arr[i]._id === id) {
      return arr[i];
    }
  }
  return false;
}