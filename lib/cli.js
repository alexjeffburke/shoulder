const ModuleStats = require('./ModuleStats');
const Project = require('./Project');
const ProjectStats = require('./ProjectStats');
const packageCheck = require('./package-check');

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

module.exports = function cli(cwd, yargv, options) {
  const packageName = yargv.package;
  const metricName = yargv.metric;
  const requirement = makeRequirementFromMetric(metricName);
  const statsOptions = {
    librariesIoApiKey: yargv.librariesio || null
  };

  options = options || {};
  const ModuleStatsConstructor = options._ModuleStats || ModuleStats;
  const log = options._log || console.log;

  const moduleStats = new ModuleStatsConstructor(packageName, statsOptions);
  return moduleStats
    .fetchDependents()
    .then(dependents => dependents.map(dependent => new Project(dependent)))
    .then(projects => verifyProjects(requirement, projects, options))
    .then(projectStats => projectStats.outputProjectNamesForMetric(metricName))
    .then(projects => {
      const output = {};

      // include the package name in the output if:
      // - we were an arbitrary call
      // - we were called within a package that did not match
      const cwdPackage = packageCheck.safe(cwd);
      if (!cwdPackage || cwdPackage.name !== packageName) {
        output.package = packageName;
      }

      // include the projects list
      output.projects = projects;

      log(JSON.stringify(output, null, 2));
    });
};
