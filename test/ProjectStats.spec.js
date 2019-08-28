const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const sinon = require('sinon');

const ModuleStats = require('../lib/ModuleStats');
const Project = require('../lib/Project');
const ProjectStats = require('../lib/ProjectStats');

describe('ProjectStats', () => {
  describe('#fetchMetricForProjects', () => {
    it('should error on unsupported metric', () => {
      return expect(
        new ProjectStats('somepackage').fetchMetricForProjects('unknown'),
        'to be rejected with',
        'unknown is not a supported metric.'
      );
    });
  });

  describe('#fetchMetricForProjects (downloads)', () => {
    let fetchStub;

    beforeEach(() => {
      fetchStub = sinon.stub(ModuleStats, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should fetch and record package.json', () => {
      fetchStub
        .onFirstCall()
        .resolves({
          json: () => ({ downloads: [{ downloads: 2 }, { downloads: 3 }] })
        })
        .onSecondCall()
        .resolves({
          json: () => ({ downloads: [] })
        });

      const projectStats = new ProjectStats([
        new Project('somedependent'),
        new Project('otherdependent')
      ]);

      return expect(
        projectStats.fetchMetricForProjects('downloads'),
        'to be fulfilled with',
        {
          somedependent: 5,
          otherdependent: 0
        }
      );
    });
  });

  describe('#fetchMetricForProjects (stars)', () => {
    let createGitHubRepositoryRequestStub;

    beforeEach(() => {
      createGitHubRepositoryRequestStub = sinon.stub(
        ModuleStats,
        'createGitHubRepositoryRequest'
      );
    });

    afterEach(() => {
      createGitHubRepositoryRequestStub.restore();
    });

    it('should total and return the stats for each package', () => {
      createGitHubRepositoryRequestStub
        .onFirstCall()
        .resolves({ stargazers_count: 5 })
        .onSecondCall()
        .resolves({ stargazers_count: 0 });

      const projectStats = new ProjectStats([
        new Project('https://github.com/org/foo.git'),
        new Project('https://github.com/org/bar')
      ]);

      return expect(
        projectStats.fetchMetricForProjects('stars'),
        'to be fulfilled with',
        {
          'https://github.com/org/foo.git': 5,
          'https://github.com/org/bar': 0
        }
      );
    });
  });

  describe('#outputProjectNamesForMetric', () => {
    it('should returned an ordered list of project names', () => {
      const projectStats = new ProjectStats([]);
      const fetchMetricForProjectsSpy = sinon
        .stub(projectStats, 'fetchMetricForProjects')
        .resolves({
          'https://github.com/org/foo': 0,
          'https://github.com/org/bar': 5,
          'https://github.com/org/baz': 1
        });

      return expect(
        () => projectStats.outputProjectNamesForMetric('the_metric'),
        'to be fulfilled with',
        [
          'https://github.com/org/bar',
          'https://github.com/org/baz',
          'https://github.com/org/foo'
        ]
      ).then(() => {
        expect(fetchMetricForProjectsSpy, 'to have a call satisfying', [
          'the_metric'
        ]);
      });
    });
  });

  describe('ProjectStats.packageNamesByMagnitude', () => {
    it('should return an ordered set of package names', () => {
      return expect(
        ProjectStats.packageNamesByMagnitude({
          foo: 3,
          bar: 2,
          baz: 4
        }),
        'to equal',
        ['baz', 'foo', 'bar']
      );
    });
  });
});
