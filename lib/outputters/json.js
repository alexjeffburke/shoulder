const packageCheck = require('../package-check');

module.exports = function jsonOutputter(projectNames, options) {
  options = options || {};

  const output = {};

  // include the package name in the output if:
  // - we were an arbitrary call
  // - we were called within a package that did not match
  const packageName = options.packageName;
  const cwdPackage = packageCheck.safe(options.cwd);
  if (!cwdPackage || cwdPackage.name !== packageName) {
    output.package = packageName;
  }

  // include the projects list
  output.projects = projectNames;

  const log = options._log || console.log;

  return log(JSON.stringify(output, null, 2));
};
