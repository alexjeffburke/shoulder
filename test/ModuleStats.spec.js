const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const sinon = require('sinon');

const ModuleStats = require('../lib/ModuleStats');

describe('ModuleStats', () => {
  it('should throw on missing module name', () => {
    return expect(
      () => {
        new ModuleStats();
      },
      'to throw',
      'Invalid module name.'
    );
  });

  it('should throw on empty module name', () => {
    return expect(
      () => {
        new ModuleStats(' ');
      },
      'to throw',
      'Invalid module name.'
    );
  });

  it('should default to npm', () => {
    const moduleStats = new ModuleStats('somepackage');

    return expect(moduleStats, 'to satisfy', {
      fetchSource: 'npm'
    });
  });

  it('should set libraries.io in the presence of an API key', () => {
    const moduleStats = new ModuleStats('somepackage', {
      librariesIoApiKey: 'SOME_KEY'
    });

    return expect(moduleStats, 'to satisfy', {
      fetchSource: 'libraries.io'
    });
  });

  describe('#fetchDependents', () => {
    it('should reject on unsupported fetch source', () => {
      const moduleStats = new ModuleStats('somepackage');

      moduleStats.fetchSource = 'other';

      return expect(
        () => moduleStats.fetchDependents(),
        'to be rejected with',
        'unsupported fetch source'
      );
    });

    it('should fetch and record npm dependents', () => {
      const moduleStats = new ModuleStats('sompackage');
      const fetchNpmDependentsStub = sinon
        .stub(moduleStats, 'fetchNpmDependents')
        .resolves([]);

      return expect(moduleStats.fetchDependents(), 'to be fulfilled').then(() =>
        expect(fetchNpmDependentsStub, 'was called')
      );
    });

    it('should fetch and record libraries.io dependents', () => {
      const moduleStats = new ModuleStats('sompackage', {
        librariesIoApiKey: 'SOME_KEY'
      });
      const fetchLibrariesIoDependentsStub = sinon
        .stub(moduleStats, 'fetchLibrariesIoDependents')
        .resolves([]);

      return expect(
        moduleStats.fetchDependents(),
        'to be fulfilled with',
        []
      ).then(() => {
        expect(fetchLibrariesIoDependentsStub, 'was called');
      });
    });

    it('should return previously fetched dependents', () => {
      const fetchSpy = sinon.spy(ModuleStats, 'fetch');
      const moduleStats = new ModuleStats('sompackage');
      moduleStats.dependents = ['quux'];

      return expect(moduleStats.fetchDependents(), 'to be fulfilled with', [
        'quux'
      ])
        .then(() => expect(fetchSpy, 'was not called'))
        .finally(() => fetchSpy.restore());
    });
  });

  describe('#fetchLibrariesIoDependents', () => {
    let fetchStub;

    beforeEach(() => {
      fetchStub = sinon.stub(ModuleStats, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should fetch and record dependents', () => {
      fetchStub
        .onFirstCall()
        .resolves({
          json: () => [
            {
              full_name: 'someorg/somepackage',
              host_type: 'GitHub'
            }
          ]
        })
        .onSecondCall()
        .resolves({
          json: () => ({ name: 'somepackage' })
        });
      const moduleStats = new ModuleStats('sompackage', {
        librariesIoApiKey: 'SOME_KEY'
      });

      return expect(
        moduleStats.fetchLibrariesIoDependents(),
        'to be fulfilled with',
        ['somepackage']
      ).then(() => {
        expect(fetchStub, 'to have calls satisfying', [
          [
            'https://libraries.io/api/NPM/sompackage/dependent_repositories?api_key=SOME_KEY'
          ],
          [
            'https://raw.githubusercontent.com/someorg/somepackage/master/package.json'
          ]
        ]);
        expect(moduleStats.dependents, 'to equal', ['somepackage']);
      });
    });

    it('should ignore dependents not hosted on GitHub', () => {
      fetchStub.resolves({
        json: () => [
          {
            full_name: 'someorg/somepackage',
            host_type: 'FooBar'
          }
        ]
      });
      const moduleStats = new ModuleStats('sompackage', {
        librariesIoApiKey: 'SOME_KEY'
      });

      return expect(
        moduleStats.fetchLibrariesIoDependents(),
        'to be fulfilled with',
        []
      ).then(() => {
        expect(fetchStub, 'was called times', 1);
        expect(moduleStats.dependents, 'to equal', []);
      });
    });

    it('should ignore dependents with no name', () => {
      fetchStub
        .onFirstCall()
        .resolves({
          json: () => [
            {
              full_name: 'someorg/somepackage',
              host_type: 'GitHub'
            }
          ]
        })
        .onSecondCall()
        .resolves({
          json: () => ({})
        });
      const moduleStats = new ModuleStats('sompackage', {
        librariesIoApiKey: 'SOME_KEY'
      });

      return expect(
        moduleStats.fetchLibrariesIoDependents(),
        'to be fulfilled with',
        []
      ).then(() => {
        expect(fetchStub, 'was called times', 2);
        expect(moduleStats.dependents, 'to equal', []);
      });
    });

    it('should ignore dependents without package.json', () => {
      fetchStub
        .onFirstCall()
        .resolves({
          json: () => [
            {
              full_name: 'someorg/somepackage',
              host_type: 'GitHub'
            }
          ]
        })
        .onSecondCall()
        .rejects(new Error('fail'));
      const moduleStats = new ModuleStats('sompackage', {
        librariesIoApiKey: 'SOME_KEY'
      });

      return expect(
        moduleStats.fetchLibrariesIoDependents(),
        'to be fulfilled with',
        []
      ).then(() => {
        expect(fetchStub, 'was called times', 2);
        expect(moduleStats.dependents, 'to equal', []);
      });
    });
  });

  describe('#fetchNpmDependents', () => {
    let dependantsStub;

    beforeEach(() => {
      dependantsStub = sinon.stub(ModuleStats, 'dependants');
    });

    afterEach(() => {
      dependantsStub.restore();
    });

    it('should fetch and record dependents', () => {
      const moduleStats = new ModuleStats('somepackage');
      function* fetchNpmDependents() {
        yield Promise.resolve('foo');
        yield Promise.resolve('bar');
        yield Promise.resolve('baz');
      }
      dependantsStub.callsFake(fetchNpmDependents);

      return expect(moduleStats.fetchNpmDependents(), 'to be fulfilled with', [
        'foo',
        'bar',
        'baz'
      ]).then(() => {
        expect(dependantsStub, 'to have a call satisfying', ['somepackage']);
      });
    });
  });

  describe('#fetchInfo', () => {
    let fetchStub;

    beforeEach(() => {
      fetchStub = sinon.stub(ModuleStats, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should fetch and record package.json', () => {
      fetchStub.resolves({
        json: () => ({ name: 'fugl', foo: 'baz' })
      });
      const moduleStats = new ModuleStats('fugl');

      return expect(moduleStats.fetchInfo(), 'to be fulfilled with', {
        name: 'fugl',
        foo: 'baz'
      }).then(() => {
        expect(moduleStats.packageJson, 'to equal', {
          name: 'fugl',
          foo: 'baz'
        });
      });
    });

    it('should fetch and record package.json for namespaced package', () => {
      fetchStub.resolves({
        json: () => ({
          name: '@namespace/foo',
          'dist-tags': { latest: '0.1.0' },
          versions: {
            '0.1.0': {
              name: '@namespace/foo',
              foo: 'baz'
            }
          }
        })
      });
      const moduleStats = new ModuleStats('@namespace/foo');

      return expect(moduleStats.fetchInfo(), 'to be fulfilled with', {
        name: '@namespace/foo',
        foo: 'baz'
      }).then(() => {
        expect(moduleStats.packageJson, 'to equal', {
          name: '@namespace/foo',
          foo: 'baz'
        });
      });
    });

    it('should return previously fetched package.json', () => {
      fetchStub.resolves();
      const moduleStats = new ModuleStats('fugl');
      const result = { name: 'fugl', foo: 'bar' };
      moduleStats.packageJson = result;

      return expect(
        moduleStats.fetchInfo(),
        'to be fulfilled with',
        result
      ).then(() => {
        expect(fetchStub, 'was not called');
      });
    });

    it('should reject on request error', () => {
      fetchStub.rejects(new Error('failure'));
      const moduleStats = new ModuleStats('fugl');

      return expect(
        () => moduleStats.fetchInfo(),
        'to be rejected with',
        'error fetching package.json for "fugl"'
      ).then(() => {
        expect(fetchStub, 'to have a call satisfying', [
          'https://registry.npmjs.org/fugl/latest'
        ]);
      });
    });

    it('should reject with a non-fatal error on request not found', () => {
      fetchStub.resolves({
        status: 404
      });
      const moduleStats = new ModuleStats('missing_package');

      return expect(
        () => moduleStats.fetchInfo(),
        'to be rejected with',
        expect
          .it('to have message', 'unable to access package "missing_package"')
          .and('to satisfy', { isNotFatal: true })
      );
    });
  });

  describe('#fetchPackageJsonFromGitHub', () => {
    let createGitHubPackageJsonRequestStub;

    beforeEach(() => {
      createGitHubPackageJsonRequestStub = sinon.stub(
        ModuleStats,
        'createGitHubPackageJsonRequest'
      );
    });

    afterEach(() => {
      createGitHubPackageJsonRequestStub.restore();
    });

    it('should fetch and record package.json', () => {
      createGitHubPackageJsonRequestStub.resolves('some_old_package');
      const moduleStats = new ModuleStats(
        'https://github.com/org/some_old_package.git'
      );

      return expect(
        moduleStats.fetchPackageJsonFromGitHub(),
        'to be fulfilled with',
        'some_old_package'
      );
    });
  });

  describe('ModuleStats.createGitHubPackageJsonRequest', () => {
    let fetchStub;

    beforeEach(() => {
      fetchStub = sinon.stub(ModuleStats, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should reject on request error', () => {
      fetchStub.rejects(new Error('failure'));

      return expect(
        () =>
          ModuleStats.createGitHubPackageJsonRequest(
            'https://github.com/org/somepackage.git'
          ),
        'to be rejected with',
        'Error feching package.json for https://github.com/org/somepackage.git'
      ).then(() => {
        expect(fetchStub, 'to have a call satisfying', [
          'https://raw.githubusercontent.com/org/somepackage/master/package.json'
        ]);
      });
    });

    it('should reject on missing package name', () => {
      fetchStub.resolves({
        json: () => ({})
      });

      return expect(
        () =>
          ModuleStats.createGitHubPackageJsonRequest(
            'https://github.com/org/somepackage.git'
          ),
        'to be rejected with',
        'Missing name in package.json for https://github.com/org/somepackage.git'
      ).then(() => {
        expect(fetchStub, 'to have a call satisfying', [
          'https://raw.githubusercontent.com/org/somepackage/master/package.json'
        ]);
      });
    });

    it('should resolve with repository info', () => {
      fetchStub.resolves({
        json: () => ({ name: 'some_old_package' })
      });

      return expect(
        () =>
          ModuleStats.createGitHubPackageJsonRequest(
            'https://github.com/org/somepackage.git'
          ),
        'to be fulfilled with',
        'some_old_package'
      );
    });

    it('should handle repoUrl prefixed with git://', () => {
      fetchStub.resolves({
        json: () => ({ name: 'some_old_package' })
      });

      return expect(
        () =>
          ModuleStats.createGitHubPackageJsonRequest(
            'git://github.com/org/somepackage.git'
          ),
        'to be fulfilled'
      ).then(() => {
        expect(fetchStub, 'to have a call satisfying', [
          'https://raw.githubusercontent.com/org/somepackage/master/package.json'
        ]);
      });
    });

    it('should handle repoUrl prefixed with ssh://', () => {
      fetchStub.resolves({
        json: () => ({ name: 'some_old_package' })
      });

      return expect(
        () =>
          ModuleStats.createGitHubPackageJsonRequest(
            'ssh://github.com/org/somepackage.git'
          ),
        'to be fulfilled'
      ).then(() => {
        expect(fetchStub, 'to have a call satisfying', [
          'https://raw.githubusercontent.com/org/somepackage/master/package.json'
        ]);
      });
    });
  });

  describe('ModuleStats.createGitHubRepositoryRequest', () => {
    let fetchStub;

    beforeEach(() => {
      fetchStub = sinon.stub(ModuleStats, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should reject on request error', () => {
      fetchStub.rejects(new Error('failure'));

      return expect(
        () =>
          ModuleStats.createGitHubRepositoryRequest(
            'https://github.com/org/somepackage.git'
          ),
        'to be rejected with',
        'Error fetching repository for https://github.com/org/somepackage.git'
      ).then(() => {
        expect(fetchStub, 'to have a call satisfying', [
          'https://api.github.com/repos/org/somepackage',
          { headers: { Accept: 'application/vnd.github.v3+json' } }
        ]);
      });
    });

    it('should resolve with repository info', () => {
      fetchStub.resolves({
        json: () => ({ stargazers_count: 45 })
      });

      return expect(
        () =>
          ModuleStats.createGitHubRepositoryRequest(
            'https://github.com/org/somepackage.git'
          ),
        'to be fulfilled with',
        { stargazers_count: 45 }
      );
    });

    it('should handle repoUrl prefixed with git://', () => {
      fetchStub.resolves({
        json: () => ({})
      });

      return expect(
        () =>
          ModuleStats.createGitHubRepositoryRequest(
            'git://github.com/org/somepackage.git'
          ),
        'to be fulfilled'
      ).then(() => {
        expect(fetchStub, 'to have a call satisfying', [
          'https://api.github.com/repos/org/somepackage',
          { headers: { Accept: 'application/vnd.github.v3+json' } }
        ]);
      });
    });

    it('should handle repoUrl prefixed with ssh://', () => {
      fetchStub.resolves({
        json: () => ({})
      });

      return expect(
        () =>
          ModuleStats.createGitHubRepositoryRequest(
            'ssh://github.com/org/somepackage.git'
          ),
        'to be fulfilled'
      ).then(() => {
        expect(fetchStub, 'to have a call satisfying', [
          'https://api.github.com/repos/org/somepackage',
          { headers: { Accept: 'application/vnd.github.v3+json' } }
        ]);
      });
    });
  });

  describe('ModuleStats.createNpmDownloadsRequest', () => {
    let fetchStub;

    beforeEach(() => {
      fetchStub = sinon.stub(ModuleStats, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should set a package to zero on a result erorr', () => {
      const now = Date.now();
      fetchStub.resolves({
        json: () => ({ error: 'does not exist' })
      });

      return expect(
        ModuleStats.createNpmDownloadsRequest('not_a_package', {
          until: now,
          since: now - 1
        }),
        'to be rejected with',
        new Error('ModuleStats: error fetching downloads for "not_a_package"')
      );
    });
  });
});
