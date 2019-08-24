const magicpen = require('magicpen');

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

  if (!this.librariesIoApiKey && !options._Shoulder) {
    const pen = magicpen();
    pen
      .text('WARNING', 'bgYellow', 'black')
      .nl()
      .text('The npm registry support for fetching dependents is ', 'yellow')
      .text('broken', 'bgRed', 'white', 'underline')
      .nl()
      .text(
        'so we are no longer able to fetch dependent packages from it.',
        'yellow'
      )
      .nl()
      .nl()
      .text(
        'Until we are able to find an alternative please use "--librariesio".',
        'yellow',
        'bold'
      )
      .nl()
      .nl();

    return Promise.reject(new Error(pen.toString('ansi')));
  }

  return new ShoulderConstructor(shoulderOptions).run(runOptions);
};
