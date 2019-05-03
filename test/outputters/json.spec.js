const expect = require('unexpected');
const path = require('path');

const outputter = require('../../lib/outputters/json');

const TEST_DATA_PATH = path.join(__dirname, '..', '..', 'testdata');

describe('outputters/json', () => {
  it('should include the package name when not in a module', () => {
    let stdoutString;

    return expect(
      () =>
        outputter(['somedependent'], {
          cwd: TEST_DATA_PATH,
          packageName: 'somepackage',
          _log: str => (stdoutString = str)
        }),
      'not to throw'
    ).then(() => {
      expect(JSON.parse(stdoutString), 'to only have keys', [
        'package',
        'projects'
      ]);
    });
  });

  it('should include the package name when in a different module', () => {
    const cwd = path.join(TEST_DATA_PATH, 'module');
    let stdoutString;

    return expect(
      () =>
        outputter(['somedependent'], {
          cwd,
          packageName: 'somepackage',
          _log: str => (stdoutString = str)
        }),
      'not to throw'
    ).then(() => {
      expect(JSON.parse(stdoutString), 'to only have keys', [
        'package',
        'projects'
      ]);
    });
  });

  it('should exclude the package name when in the same module', () => {
    const cwd = path.join(TEST_DATA_PATH, 'module');
    let stdoutString;

    return expect(
      () =>
        outputter(['somedependent'], {
          cwd,
          packageName: 'should-be-matching',
          _log: str => (stdoutString = str)
        }),
      'not to throw'
    ).then(() => {
      expect(JSON.parse(stdoutString), 'to only have keys', ['projects']);
    });
  });
});
