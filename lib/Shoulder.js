const ModuleStats = require('./ModuleStats');
const Project = require('./Project');
const ProjectStats = require('./ProjectStats');

function makeRequirementFromMetric(metric) {
  switch (metric) {
    case 'downloads':
      return 'npmName';
    case 'stars':
      return 'repoUrl';
  }
}

function verifyProjects(requirement, projects, options) {
  const ProjectStatsConstructor = options._ProjectStats || ProjectStats;

  return Promise.all(
    projects.map(project =>
      project.verify(requirement).catch(error => {
        if (error.isNotFatal) {
          console.warn(error.message);
          return null;
        } else {
          throw error;
        }
      })
    )
  )
    .then(projects => projects.filter(Boolean))
    .then(projects => new ProjectStatsConstructor(projects));
}

class Shouder {
  constructor(options) {
    options = options || {};

    if (!options.package) {
      throw new Error('Shoulder: missing package');
    }

    this.packageName = options.package;
  }

  run(options) {
    const packageName = this.packageName;

    options = options || {};
    const metricName = options.metric;
    const requirement = makeRequirementFromMetric(metricName);
    const statsOptions = {
      librariesIoApiKey: options.librariesIoApiKey || null
    };

    options = options || {};
    const ModuleStatsConstructor = options._ModuleStats || ModuleStats;

    const moduleStats = new ModuleStatsConstructor(packageName, statsOptions);
    return moduleStats
      .fetchDependents()
      .then(dependents => dependents.map(dependent => new Project(dependent)))
      .then(projects => verifyProjects(requirement, projects, options))
      .then(projectStats =>
        projectStats.outputProjectNamesForMetric(metricName)
      );
  }
}

module.exports = Shouder;
