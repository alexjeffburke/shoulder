const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const sinon = require('sinon');

const cli = require('../lib/cli');

function createMockShoulder() {
  const MockShoulder = sinon.stub().named('MockShoulder');

  MockShoulder._instance = {
    run: sinon.stub().named('run')
  };

  return MockShoulder.callsFake(() => MockShoulder._instance);
}

expect.addAssertion('<string> to be JSON', (expect, subject) => {
  expect(() => {
    return JSON.parse(subject);
  }, 'not to error');
});

describe('cli', () => {
  it('should construct Shoulder', () => {
    const MockShoulder = createMockShoulder();
    MockShoulder._instance.run.rejects(new Error('fail'));
    const args = {
      package: 'somepackage'
    };

    return expect(
      () =>
        cli(null, args, {
          _Shoulder: MockShoulder
        }),
      'to be rejected'
    ).then(() => {
      expect(MockShoulder, 'to have a call satisfying', [
        { package: 'somepackage' }
      ]);
    });
  });

  it('should pass the metric into run', () => {
    const MockShoulder = createMockShoulder();
    MockShoulder._instance.run.rejects(new Error('fail'));
    const args = {
      package: 'somepackage',
      metric: 'downloads'
    };

    return expect(
      () =>
        cli(null, args, {
          _Shoulder: MockShoulder
        }),
      'to be rejected'
    ).then(() => {
      expect(MockShoulder._instance.run, 'to have a call satisfying', [
        { metric: 'downloads', librariesIoApiKey: undefined }
      ]);
    });
  });

  it('should pass the librariesio key into run', () => {
    const MockShoulder = createMockShoulder();
    MockShoulder._instance.run.rejects(new Error('fail'));
    const args = {
      package: 'somepackage',
      metric: 'stars',
      librariesio: 'SOME_KEY'
    };

    return expect(
      () =>
        cli(null, args, {
          _Shoulder: MockShoulder
        }),
      'to be rejected'
    ).then(() => {
      expect(MockShoulder._instance.run, 'to have a call satisfying', [
        { metric: 'stars', librariesIoApiKey: 'SOME_KEY' }
      ]);
    });
  });
});
