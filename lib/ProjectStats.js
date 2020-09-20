const _ = require('lodash');

const ModuleStats = require('./ModuleStats');

const WEEK_IN_MILLISECONDS = 604800000; // 7 * 24 * 60 * 60 * 1000

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

    return Promise.all(Object.values(statsPromises)).then(() => {
      return statsPromises;
    });
  }

  fetchStarsForProjects() {
    return Promise.resolve().then(async () => {
      const statsPromises = {};

      for (const { repoUrl: packageName } of this.projects) {
        let repositoryInfo;
        try {
          repositoryInfo = await ModuleStats.createGitHubRepositoryRequest(
            packageName
          );
        } catch (e) {
          repositoryInfo = {}; // default result on request error
        }
        statsPromises[packageName] = repositoryInfo.stargazers_count || 0;
      }

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
