// Allow using DEBUG=true instead of debug-module syntax
if (process.env.DEBUG === 'true') {
  process.env.DEBUG = 'shoulder*';
}

module.exports = require('debug')('shoulder');
