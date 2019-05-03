const Shoulder = require('./Shoulder');

module.exports = function cli(cwd, yargv, options) {
  const shoulderOptions = {
    package: yargv.package,
    outputter: 'json'
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
