/**
 * Function for getting the current status of the 3D-Printer
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} status object
 */
exports.getStatus = function (req, res) {

  const ready = __printer.isReady();
  const busy = __printer.isBusy();

  return res.json({
    status: {
      ready: ready,
      busy: busy
    }
  });

}

/**
 * Function for getting the current progress of the 3D-Printer
 * 
 * @param {object} req the node request parameter
 * @param {object} res the node response parameter
 * 
 * @returns {object} progress object
 */
exports.getProgress = function (req, res) {
  return res.json({
    progress: __printer.getProgress()
  });
}