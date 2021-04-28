const packageCheck = require('./package-check');
const Shoulder = require('./Shoulder');

function yargvToOutputter(yargv) {
  if (yargv.list) {
    return 'list';
  } else if (yargv.json) {
    return 'json';
  } else {
    return 'nbsp';
  }
}

module.exports = function cli(cwd, yargv, options) {
  let packageName = yargv.package;

  if (packageName === '.') {
    try {
      packageName = packageCheck(cwd).name;
    } catch (e) {
      packageName = null;
    }
  }

  const shoulderOptions = {
    package: packageName,
    outputter: yargvToOutputter(yargv)
  };
  const runOptions = {
    cwd,
    metric: yargv.metric,
    librariesIoApiKey: yargv.librariesio
  };

  options = options || {};
  const ShoulderConstructor = options._Shoulder || Shoulder;

  return new ShoulderConstructor(shoulderOptions).run(runOptions);
};
