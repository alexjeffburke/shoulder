module.exports = function(projectNames, options) {
  options = options || {};
  const log = options._log || console.log;

  log(projectNames.join(' '));
};
