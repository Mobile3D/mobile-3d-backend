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

exports.getProgress = function (req, res) {
  return res.json({
    progress: __printer.getProgress()
  });
}