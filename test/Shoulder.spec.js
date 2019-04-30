const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const sinon = require('sinon');

const Shoulder = require('../lib/Shoulder');
const Project = require('../lib/Project');

function createMockModuleStats() {
  const MockModuleStats = sinon.stub().named('MockModuleStats');

  MockModuleStats._instance = {
    fetchDependents: sinon.stub().named('fetchDependents'),
    fetchMetricForProjects: sinon.stub().named('fetchMetricForProjects')
  };

  return MockModuleStats.callsFake(() => MockModuleStats._instance);
}

function createMockProjectStats() {
  const MockProjectStats = sinon.stub().named('MockProjectStats');

  MockProjectStats._instance = {
    outputProjectNamesForMetric: sinon.stub().named('fetchMetricForProjects')
  };

  return MockProjectStats.callsFake(() => MockProjectStats._instance);
}

expect.addAssertion('<string> to be JSON', (expect, subject) => {
  expect(() => {
    return JSON.parse(subject);
  }, 'not to error');
});

describe('Shoulder', () => {
  it('should throw on missing package', () => {
    expect(
      () => {
        new Shoulder();
      },
      'to throw',
      'Shoulder: missing package'
    );
  });

  it('should construct ModuleStats', () => {
    const MockModuleStats = createMockModuleStats();
    MockModuleStats._instance.fetchDependents.rejects(new Error('fail'));

    const shoulder = new Shoulder({
      package: 'somepackage'
    });

    return expect(
      () =>
        shoulder.run({
          librariesIoApiKey: 'SOME_KEY',
          _ModuleStats: MockModuleStats
        }),
      'to be rejected'
    ).then(() => {
      expect(MockModuleStats, 'to have a call satisfying', [
        'somepackage',
        { librariesIoApiKey: 'SOME_KEY' }
      ]);
    });
  });

  it('should execute dependents fetch for "downloads"', () => {
    const MockModuleStats = createMockModuleStats();
    MockModuleStats._instance.fetchDependents.resolves(['foo']);
    const MockProjectStats = createMockProjectStats();
    MockProjectStats._instance.outputProjectNamesForMetric.resolves([
      'somedependent'
    ]);

    const shoulder = new Shoulder({
      package: 'somepackage'
    });

    return expect(
      () =>
        shoulder.run({
          metric: 'downloads',
          _ModuleStats: MockModuleStats,
          _ProjectStats: MockProjectStats,
          _log: () => {}
        }),
      'to be fulfilled'
    ).then(() => {
      expect(
        MockProjectStats._instance.outputProjectNamesForMetric,
        'to have a call satisfying',
        ['downloads']
      );
    });
  });

  it('should execute dependents fetch for "stars"', () => {
    const MockModuleStats = createMockModuleStats();
    MockModuleStats._instance.fetchDependents.resolves([
      'https://service.tld/foo.git'
    ]);
    const MockProjectStats = createMockProjectStats();
    MockProjectStats._instance.outputProjectNamesForMetric.resolves([
      'somedependent'
    ]);

    const shoulder = new Shoulder({
      package: 'somepackage'
    });

    return expect(
      () =>
        shoulder.run({
          metric: 'stars',
          _ModuleStats: MockModuleStats,
          _ProjectStats: MockProjectStats,
          _log: () => {}
        }),
      'to be fulfilled'
    ).then(() => {
      expect(MockProjectStats, 'to have a call satisfying', [
        expect.it('to have items satisfying', 'to be a', Project)
      ]);
      expect(
        MockProjectStats._instance.outputProjectNamesForMetric,
        'to have a call satisfying',
        ['stars']
      );
    });
  });

  it('should resolve with dependents', () => {
    const MockModuleStats = createMockModuleStats();
    MockModuleStats._instance.fetchDependents.resolves(['foo']);
    const MockProjectStats = createMockProjectStats();
    MockProjectStats._instance.outputProjectNamesForMetric.resolves([
      'somedependent'
    ]);

    const shoulder = new Shoulder({
      package: 'somepackage'
    });

    return expect(
      () =>
        shoulder.run({
          metric: 'downloads',
          _ModuleStats: MockModuleStats,
          _ProjectStats: MockProjectStats
        }),
      'to be fulfilled with',
      ['somedependent']
    );
  });
});
