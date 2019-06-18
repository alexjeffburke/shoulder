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
  const shoulderOptions = {
    package: yargv.package,
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
