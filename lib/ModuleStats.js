const debug = require('./debug').extend('ModuleStats');
const fetch = require('node-fetch');
const Registry = require('npm-stats')();

function createPackageRequest(moduleName, methodName, options) {
  options = options || {};

  let registry;
  if (options._registry) {
    registry = options._registry;
    delete options._registry;
  } else {
    registry = Registry;
  }

  return new Promise((resolve, reject) => {
    const args = [
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    ];

    if (Object.keys(options).length > 0) {
      args.unshift(options);
    }

    registry.module(moduleName)[methodName](...args);
  });
}

function createGitHubPackageJsonRequest(repoUrl) {
  let userContentUrl = repoUrl.replace(
    'github.com',
    'raw.githubusercontent.com'
  );

  userContentUrl = toGitHubHttpsUrl(userContentUrl);

  return ModuleStats.fetch(`${userContentUrl}/master/package.json`)
    .then(res => res.json())
    .catch(() => {
      throw new Error(`Error feching package.json for ${repoUrl}`);
    })
    .then(packageJson => {
      if (packageJson.name) {
        return packageJson.name;
      } else {
        throw new Error(`Missing name in package.json for ${repoUrl}`);
      }
    });
}

function createGitHubRepositoryRequest(repoUrl) {
  let gitHubApiUrl = repoUrl.replace('github.com', 'api.github.com/repos');

  gitHubApiUrl = toGitHubHttpsUrl(gitHubApiUrl);

  return ModuleStats.fetch(gitHubApiUrl, {
    headers: {
      Accept: 'application/vnd.github.v3+json'
    }
  })
    .then(res => res.json())
    .catch(() => {
      throw new Error(`Error fetching repository for ${repoUrl}`);
    });
}

function parseLibrariesIoItemToRepoUrl(item) {
  const fullName = item.full_name;
  const hostType = item.host_type;

  if (hostType !== 'GitHub') {
    throw new Error(`Hosting was not by GitHub for ${fullName}`);
  }

  return `https://github.com/${fullName}`;
}

function toGitHubHttpsUrl(url) {
  // remove .git suffix
  if (/\.git$/.test(url)) {
    url = url.slice(0, -4);
  }

  // convert to https
  if (/^git:\/\//.test(url)) {
    url = url.replace('git://', 'https://');
  }
  if (/^ssh:\/\//.test(url)) {
    url = url.replace('ssh://', 'https://');
  }

  return url;
}

class ModuleStats {
  constructor(moduleName, options) {
    if (!(typeof moduleName === 'string' && moduleName.trim().length)) {
      throw new Error('Invalid module name.');
    }

    this.moduleName = moduleName;
    this.dependents = null;
    this.packageJson = null;

    options = options || {};
    this.librariesIoApiKey = options.librariesIoApiKey || null;

    this.fetchSource = this.librariesIoApiKey !== null ? 'libraries.io' : 'npm';
  }

  makeLibrariesIoUrl() {
    const what = encodeURIComponent(this.moduleName);

    return `https://libraries.io/api/NPM/${what}/dependent_repositories?api_key=${
      this.librariesIoApiKey
    }`;
  }

  fetchDependents() {
    if (this.dependents !== null) {
      return Promise.resolve(this.dependents);
    }

    switch (this.fetchSource) {
      case 'libraries.io':
        return this.fetchLibrariesIoDependents();
      case 'npm':
        return this.fetchNpmDependents();
      default:
        return Promise.reject(new Error('unsupported fetch source'));
    }
  }

  fetchLibrariesIoDependents() {
    const url = this.makeLibrariesIoUrl();

    return ModuleStats.fetch(url)
      .then(res => {
        return res.json();
      })
      .then(results => {
        const depdendents = [];

        return results.reduce((prev, item) => {
          return prev.then(() => {
            return Promise.resolve()
              .then(() => parseLibrariesIoItemToRepoUrl(item))
              .then(repoUrl =>
                ModuleStats.createGitHubPackageJsonRequest(repoUrl)
              )
              .then(depdendent => depdendents.push(depdendent))
              .catch(error => debug(error))
              .then(() => depdendents);
          });
        }, Promise.resolve(depdendents));
      })
      .then(dependents => {
        this.dependents = dependents;
        return dependents;
      });
  }

  fetchNpmDependents() {
    return ModuleStats.createPackageRequest(this.moduleName, 'dependents').then(
      result => {
        this.dependents = result;
        return result;
      }
    );
  }

  fetchInfo() {
    if (this.packageJson !== null) {
      return Promise.resolve(this.packageJson);
    }

    return ModuleStats.createPackageRequest(this.moduleName, 'latest').then(
      result => {
        this.packageJson = result;
        return result;
      }
    );
  }

  fetchPackageJsonFromGitHub() {
    return ModuleStats.createGitHubPackageJsonRequest(this.moduleName);
  }
}

// npm
ModuleStats.createPackageRequest = createPackageRequest;

// GitHub
ModuleStats.createGitHubRepositoryRequest = createGitHubRepositoryRequest;
ModuleStats.createGitHubPackageJsonRequest = createGitHubPackageJsonRequest;

ModuleStats.fetch = fetch;

module.exports = ModuleStats;
