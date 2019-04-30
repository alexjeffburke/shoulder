const Shoulder = require('./Shoulder');
const packageCheck = require('./package-check');

module.exports = function cli(cwd, yargv, options) {
  const shoulderOptions = {
    package: yargv.package
  };
  const runOptions = {
    metric: yargv.metric,
    librariesIoApiKey: yargv.librariesio
  };

  options = options || {};
  const ShoulderConstructor = options._Shoulder || Shoulder;
  const log = options._log || console.log;

  return new ShoulderConstructor(shoulderOptions)
    .run(runOptions)
    .then(projectNames => {
      const output = {};

      // include the package name in the output if:
      // - we were an arbitrary call
      // - we were called within a package that did not match
      const packageName = shoulderOptions.package;
      const cwdPackage = packageCheck.safe(cwd);
      if (!cwdPackage || cwdPackage.name !== packageName) {
        output.package = packageName;
      }

      // include the projects list
      output.projects = projectNames;

      log(JSON.stringify(output, null, 2));
    });
};
