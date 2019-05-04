const ModuleStats = require('./ModuleStats');
const Project = require('./Project');
const ProjectStats = require('./ProjectStats');
const outputters = require('./outputters');

function makeRequirementFromMetric(metric) {
  switch (metric) {
    case 'downloads':
      return 'npmName';
    case 'stars':
      return 'repoUrl';
    default:
      throw new Error(`Shoulder: unsupported metric ${metric}`);
  }
}

function verifyProjects(requirement, projects, options) {
  options = options || {};
  const ProjectStatsConstructor = options._ProjectStats || ProjectStats;
  const warn = options._warn || console.warn;

  return Promise.all(
    projects.map(project =>
      project.verify(requirement).catch(error => {
        if (error.isNotFatal) {
          warn(error.message);
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

class Shoulder {
  constructor(options) {
    options = options || {};

    if (!options.package) {
      throw new Error('Shoulder: missing package');
    }

    const outputter =
      typeof options.outputter === 'string'
        ? outputters[options.outputter]
        : () => {};
    if (!outputter) {
      throw new Error(`Shoulder: unsupported outputter ${options.outputter}`);
    }

    this.packageName = options.package;
    this.outputter = outputter;
  }

  output(projectNames, outputterOptions) {
    this.outputter(projectNames, outputterOptions);
  }

  run(options) {
    options = options || {};
    const cwd = options.cwd;
    const packageName = this.packageName;

    options = options || {};
    const metricName = options.metric;
    let requirement;
    try {
      requirement = makeRequirementFromMetric(metricName);
    } catch (error) {
      return Promise.reject(error);
    }

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
      )
      .then(projectNames => {
        this.output(projectNames, { cwd, packageName });

        return projectNames;
      });
  }
}

Shoulder.verifyProjects = verifyProjects;

module.exports = Shoulder;
