const _ = require('lodash');

const ModuleStats = require('./ModuleStats');

const WEEK_IN_MILLISECONDS = 604800000; // 7 * 24 * 60 * 60 * 1000

const objectValues =
  Object.values ||
  function objectValues(object) {
    return Object.keys(object).map(key => object[key]);
  };

const packageNamesByMagnitude = metricResult =>
  _.chain(metricResult)
    .toPairs()
    .orderBy(([, magnitude]) => magnitude, 'desc')
    .map(([packageName]) => packageName)
    .value();

class ProjectStats {
  constructor(projects) {
    this.projects = projects;
  }

  fetchDownloadsForProjects() {
    const statsPromises = {};

    const until = Date.now();
    const durationOptions = {
      until,
      since: until - WEEK_IN_MILLISECONDS
    };

    this.projects.forEach(({ npmName: packageName }) => {
      statsPromises[packageName] = ModuleStats.createNpmDownloadsRequest(
        packageName,
        durationOptions
      )
        .catch(() => []) // default result on request error
        .then(dataPoints => {
          statsPromises[packageName] = 0;
          dataPoints.forEach(
            ({ downloads }) => (statsPromises[packageName] += downloads)
          );
        });
    });

    return Promise.all(objectValues(statsPromises)).then(() => {
      return statsPromises;
    });
  }

  fetchStarsForProjects() {
    const statsPromises = {};

    return this.projects
      .reduce((prev, { repoUrl: packageName }) => {
        return prev.then(() =>
          ModuleStats.createGitHubRepositoryRequest(packageName)
            .catch(() => ({})) // default result on request error
            .then(repositoryInfo => {
              statsPromises[packageName] = repositoryInfo.stargazers_count || 0;
            })
        );
      }, Promise.resolve())
      .then(() => {
        return statsPromises;
      });
  }

  fetchMetricForProjects(metric) {
    switch (metric) {
      case 'downloads':
        return this.fetchDownloadsForProjects();
      case 'stars':
        return this.fetchStarsForProjects();
      default:
        return Promise.reject(
          new Error(`${metric} is not a supported metric.`)
        );
    }
  }

  outputProjectNamesForMetric(metric) {
    return this.fetchMetricForProjects(metric).then(packageNamesByMagnitude);
  }
}

ProjectStats.packageNamesByMagnitude = packageNamesByMagnitude;

module.exports = ProjectStats;
