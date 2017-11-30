let glob = require('glob');
let executable = require('executable');
let { basename } = require('path');
let { promisify } = require('util');

let flatten = require('./flatten');
let sh = require('.');

glob = promisify(glob);

module.exports = async () => {
  let pathDirs = process.env.PATH.split(':');

  let globResults = await Promise.all(pathDirs.map(
    dir => glob(`${dir}/**/*`, { nodir: true })
  ));

  let allFilePaths = globResults.reduce(flatten, []);

  let testedFileNames = await Promise.all(allFilePaths.map(
    x => Promise.all([executable(x), basename(x)])
  ));

  let executables = testedFileNames
    .filter(([isExec]) => isExec)
    .map(xs => xs[1]);

  return Array.from(new Set(executables).values());
};
