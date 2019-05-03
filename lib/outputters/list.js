module.exports = function(projectNames, options) {
  options = options || {};
  const log = options._log || console.log;

  projectNames.forEach(str => log(str));
};
