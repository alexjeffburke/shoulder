const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const sinon = require('sinon');

const Shoulder = require('../lib/Shoulder');
const Project = require('../lib/Project');
const outputters = require('../lib/outputters');

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

  it('should throw on an unsupported outputter', () => {
    expect(
      () => {
        new Shoulder({ package: 'somepackage', outputter: 'unknown' });
      },
      'to throw',
      'Shoulder: unsupported outputter unknown'
    );
  });

  it('should reject on invalid metric', () => {
    const MockModuleStats = createMockModuleStats();
    MockModuleStats._instance.fetchDependents.rejects(new Error('fail'));

    const shoulder = new Shoulder({
      package: 'somepackage'
    });

    return expect(
      () => shoulder.run({ metric: 'unknown' }),
      'to be rejected with',
      new Error('Shoulder: unsupported metric unknown')
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
          metric: 'downloads',
          librariesIoApiKey: 'SOME_KEY',
          _ModuleStats: MockModuleStats
        }),
      'to be rejected with',
      'fail'
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

  it('should call the outputter with the correct arguments', () => {
    const MockModuleStats = createMockModuleStats();
    MockModuleStats._instance.fetchDependents.resolves(['foo']);
    const MockProjectStats = createMockProjectStats();
    MockProjectStats._instance.outputProjectNamesForMetric.resolves([
      'somedependent'
    ]);

    const shoulder = new Shoulder({
      package: 'somepackage'
    });
    sinon.stub(shoulder, 'output');

    return expect(
      () =>
        shoulder.run({
          cwd: '/some/path',
          metric: 'downloads',
          _ModuleStats: MockModuleStats,
          _ProjectStats: MockProjectStats
        }),
      'to be fulfilled'
    ).then(() => {
      expect(shoulder.output, 'to have a call satisfying', [
        ['somedependent'],
        { cwd: '/some/path', packageName: 'somepackage' }
      ]);
    });
  });

  describe('outputters', () => {
    it('should default to passthrough', () => {
      const shoulder = new Shoulder({
        package: 'somepackage'
      });

      expect(shoulder.outputter, 'to be a function');
    });

    it('should allow json', () => {
      const shoulder = new Shoulder({
        package: 'somepackage',
        outputter: 'json'
      });

      expect(shoulder.outputter, 'to be', outputters.json);
    });

    it('should allow list', () => {
      const shoulder = new Shoulder({
        package: 'somepackage',
        outputter: 'list'
      });

      expect(shoulder.outputter, 'to be', outputters.list);
    });

    it('should allow nbsp', () => {
      const shoulder = new Shoulder({
        package: 'somepackage',
        outputter: 'nbsp'
      });

      expect(shoulder.outputter, 'to be', outputters.nbsp);
    });
  });

  describe('verifyProjects()', () => {
    it('should verify the project with the supplied requirement', () => {
      let verifyArgs;
      const fakeProject = {
        verify: (...args) => {
          verifyArgs = args;

          return Promise.resolve();
        }
      };
      const MockProjectStats = createMockProjectStats();

      return expect(
        () =>
          Shoulder.verifyProjects('somerequirement', [fakeProject], {
            _ProjectStats: MockProjectStats
          }),
        'to be fulfilled'
      ).then(() => {
        expect(verifyArgs, 'to equal', ['somerequirement']);
      });
    });

    it('should forward the verified project into ModuleStats', () => {
      const fakeProject = {
        verify: () => {
          return Promise.resolve(fakeProject);
        }
      };
      const MockProjectStats = createMockProjectStats();

      return expect(
        () =>
          Shoulder.verifyProjects('somerequirement', [fakeProject], {
            _ProjectStats: MockProjectStats
          }),
        'to be fulfilled'
      ).then(() => {
        expect(MockProjectStats, 'to have a call satisfying', [[fakeProject]]);
      });
    });

    describe('when verification fails', () => {
      it('should reject on project verification fail', () => {
        const fakeProject = {
          verify: () => {
            return Promise.reject(new Error('unexpected failure'));
          }
        };
        const MockProjectStats = createMockProjectStats();

        return expect(
          () =>
            Shoulder.verifyProjects('somerequirement', [fakeProject], {
              _ProjectStats: MockProjectStats,
              _warn: () => {}
            }),
          'to be rejected'
        );
      });

      it('should warn on project verification fail that is ignored', () => {
        let warnString;
        const fakeProject = {
          verify: () => {
            const error = new Error('ignored failure');
            error.isNotFatal = true;
            return Promise.reject(error);
          }
        };
        const MockProjectStats = createMockProjectStats();

        return expect(
          () =>
            Shoulder.verifyProjects('somerequirement', [fakeProject], {
              _ProjectStats: MockProjectStats,
              _warn: str => (warnString = str)
            }),
          'to be fulfilled'
        ).then(() => {
          expect(warnString, 'to equal', 'ignored failure');
        });
      });

      it('should exclude a project on verification fail that is ignored', () => {
        const fakeProject = {
          verify: () => {
            const error = new Error('ignored failure');
            error.isNotFatal = true;
            return Promise.reject(error);
          }
        };
        const MockProjectStats = createMockProjectStats();

        return expect(
          () =>
            Shoulder.verifyProjects('somerequirement', [fakeProject], {
              _ProjectStats: MockProjectStats,
              _warn: () => {}
            }),
          'to be fulfilled'
        ).then(() => {
          expect(MockProjectStats, 'to have a call satisfying', [[]]);
        });
      });
    });
  });
});
