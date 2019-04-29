const path = require('path');

function packageCheck(packagePath) {
  let pkg;
  try {
    pkg = require(path.join(packagePath, 'package.json'));
  } catch (e) {
    throw new Error(`The folder ${packagePath} contain no valid package.`);
  }

  if (!pkg.name) {
    throw new Error(`The package in ${packagePath} has no name.`);
  }

  return pkg;
}

function packageCheckSafe(packagePath) {
  try {
    return packageCheck(packagePath);
  } catch (e) {
    return null;
  }
}

module.exports = packageCheck;
module.exports.safe = packageCheckSafe;
