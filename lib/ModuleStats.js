const debug = require('./debug').extend('ModuleStats');
const dependants = require('npm-dependants');
const fetch = require('node-fetch');

function toTwoChr(n) {
  n = String(n);
  return n.length < 2 ? `0${n}` : n;
}

function toYMD(date) {
  date = new Date(date);
  return [
    date.getFullYear(),
    toTwoChr(date.getMonth() + 1),
    toTwoChr(date.getDate())
  ].join('-');
}

function createNpmDownloadsRequest(moduleName, options) {
  const detail = options.detail || 'range';
  const period = `${toYMD(options.since)}:${toYMD(options.until)}`;
  const downloadPath = [detail, period, moduleName].join('/');

  // https://api.npmjs.org/downloads/ :detail=(point|range) / :period=(last-month|last-week|last-day|YYYY-MM-DD:YYYY-MM-DD) / :package?

  return ModuleStats.fetch(`https://api.npmjs.org/downloads/${downloadPath}`)
    .then(res => res.json())
    .then(result => {
      if (result.error) throw new Error(result.error);
      return result.downloads;
    })
    .catch(() => {
      throw new Error(
        `ModuleStats: error fetching downloads for "${moduleName}"`
      );
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

    return `https://libraries.io/api/NPM/${what}/dependent_repositories?api_key=${this.librariesIoApiKey}`;
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

    return Promise.resolve().then(async () => {
      const res = await ModuleStats.fetch(url);
      const results = await res.json();

      const dependents = [];
      for (const item of results) {
        try {
          const repoUrl = parseLibrariesIoItemToRepoUrl(item);
          const depdendent = await ModuleStats.createGitHubPackageJsonRequest(
            repoUrl
          );
          dependents.push(depdendent);
        } catch (error) {
          debug(error);
        }
      }
      this.dependents = dependents;
      return dependents;
    });
  }

  fetchNpmDependents() {
    return Promise.resolve().then(async () => {
      const dependants = [];
      for await (const dependant of ModuleStats.dependants(this.moduleName)) {
        dependants.push(dependant);
      }
      this.dependents = dependants;
      return this.dependents;
    });
  }

  fetchInfo() {
    if (this.packageJson !== null) {
      return Promise.resolve(this.packageJson);
    }

    const moduleName = this.moduleName;
    const isNamespaced = this.moduleName.startsWith('@');

    return ModuleStats.fetch(
      `https://registry.npmjs.org/${moduleName}${isNamespaced ? '' : '/latest'}`
    )
      .then(res => {
        return res.json();
      })
      .catch(() => {
        throw new Error(
          `ModuleStats: error fetching package.json for "${moduleName}"`
        );
      })
      .then(packageJson => {
        if (isNamespaced) {
          const latestVersion = packageJson['dist-tags'].latest;
          packageJson = packageJson.versions[latestVersion];
        }

        this.packageJson = packageJson;

        return packageJson;
      });
  }

  fetchPackageJsonFromGitHub() {
    return ModuleStats.createGitHubPackageJsonRequest(this.moduleName);
  }
}

// npm
ModuleStats.createNpmDownloadsRequest = createNpmDownloadsRequest;

// GitHub
ModuleStats.createGitHubRepositoryRequest = createGitHubRepositoryRequest;
ModuleStats.createGitHubPackageJsonRequest = createGitHubPackageJsonRequest;

ModuleStats.dependants = dependants;
ModuleStats.fetch = fetch;

module.exports = ModuleStats;
