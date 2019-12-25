const expect = require('unexpected');
const path = require('path');

const outputter = require('../../lib/outputters/list');

const TEST_DATA_PATH = path.join(__dirname, '..', '..', 'testdata');

describe('outputters/list', () => {
  it('should output a project name per line', () => {
    const lines = [];

    return expect(
      () =>
        outputter(['somedependent', 'anotherdependent'], {
          cwd: TEST_DATA_PATH,
          packageName: 'somepackage',
          _log: str => lines.push(str)
        }),
      'not to throw'
    ).then(() => {
      expect(lines, 'to equal', ['somedependent', 'anotherdependent']);
    });
  });
});
