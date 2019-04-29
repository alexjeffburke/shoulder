const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const path = require('path');
const sinon = require('sinon');

const cli = require('../lib/cli');
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

describe('cli', () => {
  it('should construct ModuleStats', () => {
    const MockModuleStats = createMockModuleStats();
    MockModuleStats._instance.fetchDependents.rejects(new Error('fail'));
    const args = {
      package: 'somepackage',
      librariesio: 'SOME_KEY'
    };

    return expect(
      () =>
        cli(null, args, {
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
    const args = {
      metric: 'downloads'
    };

    return expect(
      () =>
        cli(null, args, {
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
    const args = {
      metric: 'stars'
    };

    return expect(
      () =>
        cli(null, args, {
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

  it('should output dependents data to stdout', () => {
    const MockModuleStats = createMockModuleStats();
    MockModuleStats._instance.fetchDependents.resolves(['foo']);
    const MockProjectStats = createMockProjectStats();
    MockProjectStats._instance.outputProjectNamesForMetric.resolves([
      'somedependent'
    ]);
    const log = sinon.stub().named('console.log');
    const args = {
      metric: 'downloads'
    };

    return expect(
      () =>
        cli(null, args, {
          _ModuleStats: MockModuleStats,
          _log: log
        }),
      'to be fulfilled'
    ).then(() => {
      expect(log, 'to have a call satisfying', [
        expect.it('to be a string').and('to be JSON')
      ]);
    });
  });

  describe('when writing JSON to stdout', () => {
    it('should include the package name when not in a module', () => {
      const MockModuleStats = createMockModuleStats();
      MockModuleStats._instance.fetchDependents.resolves(['foo']);
      const MockProjectStats = createMockProjectStats();
      MockProjectStats._instance.outputProjectNamesForMetric.resolves([
        'somedependent'
      ]);
      const args = {
        package: 'somepackage',
        metric: 'downloads'
      };

      let stdoutString;

      return expect(
        () =>
          cli(null, args, {
            _ModuleStats: MockModuleStats,
            _log: str => (stdoutString = str)
          }),
        'to be fulfilled'
      ).then(() => {
        expect(JSON.parse(stdoutString), 'to only have keys', [
          'package',
          'projects'
        ]);
      });
    });

    it('should include the package name when in a different module', () => {
      const MockModuleStats = createMockModuleStats();
      MockModuleStats._instance.fetchDependents.resolves(['foo']);
      const MockProjectStats = createMockProjectStats();
      MockProjectStats._instance.outputProjectNamesForMetric.resolves([
        'somedependent'
      ]);
      const cwd = path.join(__dirname, '..', 'testdata', 'module');
      const args = {
        package: 'somepackage',
        metric: 'downloads'
      };

      let stdoutString;

      return expect(
        () =>
          cli(cwd, args, {
            _ModuleStats: MockModuleStats,
            _log: str => (stdoutString = str)
          }),
        'to be fulfilled'
      ).then(() => {
        expect(JSON.parse(stdoutString), 'to only have keys', [
          'package',
          'projects'
        ]);
      });
    });
  });

  it('should exclude the package name when in the same module', () => {
    const MockModuleStats = createMockModuleStats();
    MockModuleStats._instance.fetchDependents.resolves(['foo']);
    const MockProjectStats = createMockProjectStats();
    MockProjectStats._instance.outputProjectNamesForMetric.resolves([
      'somedependent'
    ]);
    const cwd = path.join(__dirname, '..', 'testdata', 'module');
    const args = {
      package: 'should-be-matching',
      metric: 'downloads'
    };

    let stdoutString;

    return expect(
      () =>
        cli(cwd, args, {
          _ModuleStats: MockModuleStats,
          _log: str => (stdoutString = str)
        }),
      'to be fulfilled'
    ).then(() => {
      expect(JSON.parse(stdoutString), 'to only have keys', ['projects']);
    });
  });
});
