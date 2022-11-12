import {execSync} from 'child_process';
import {deleteSync} from 'del';
import * as fs from 'fs';
import gulp from 'gulp';
import git from 'gulp-git';
import mocha from 'gulp-mocha';
import {default as replace} from 'gulp-replace';
import _ from 'lodash';
import minimist from 'minimist';
import {createRequire} from 'module';
import {inspect} from 'node:util';
import * as path from 'path';

const src = gulp.src;
const dest = gulp.dest;

export {npmUpdateProject} from './npm-commands.js';


const requireModule = createRequire(import.meta.url);
const loadJSON = requireModule;

let generateCommonJS = true;
// When transpiling Cjs files, an export {} appears at the end.  Lots of threads on this.  For us, we just clean it out.
// However, we shouldn't be transpiling to .cjs with our bi-loader build (commonjs and cjs)
let cleanCjsTranspilation = true;
// The top level package.json as an object
let packageJson = null;
// The base json for distributions
let packageDistJSon = null;
// Timeout for git
let gitTimeout = null;
// We want to wait after an NPM publish to support npmu as (especially on Sundays) npm is slow to make freshly published packages visible
let npmTimeout = null;

// ts-config file for commonjs processing.  We do NOT use .cts files and .mts files
let tsConfigBuildCjsFileName = './tsconfig.build-cjs.json';
let tsConfigBuildCjs = loadJSON(tsConfigBuildCjsFileName);
// ts-config file for es processing.  We do NOT use .cts and .mts files.
let tsConfigBuildMjsFileName = './tsconfig.build-mjs.json';
let tsConfigBuildMjs = loadJSON(tsConfigBuildMjsFileName);
// ts-config file for commonjs processing.
let tsConfigBuildTestCjsFileName = './tsconfig.build-test-cjs.json';
let tsConfigBuildTestCjs = loadJSON(tsConfigBuildTestCjsFileName);
// ts-config file for es processing
let tsConfigBuildTestMjsFileName = './tsconfig.build-test-mjs.json';
let tsConfigBuildTestMjs = loadJSON(tsConfigBuildTestMjsFileName);

// The main branch
export let mainBranch = 'master'; // TODO: Do this once and for all!

// Source folders
// Source for typescript and javascript.  Javascript extensions should be .cjs or .mjs or one of the distributions won't work!
export let tsSrcDir = './ts-src';
// Source for typescript tests and/or javascript tests. Javascript extensions should be .cjs or .mjs or one of the distributions won't work!
export let tsTestDir = './ts-test';
// Intermediate transpile target directory for typescript to commonjs
export let buildCjsDir = './build-cjs';
// Intermediate transpile target directory for typescript to es
export let buildMjsDir = './build-mjs';
// Transpile target directory for typescript tests to common js
export let testingCjsDir = './testing-cjs';
// Transpile target directory for typescript tests to es
export let testingMjsDir = './testing-mjs';
// TODO Unsure what this is?
// export let releaseDir = './release';
// NPM publish folder
export let publishDir = './publish';
// CommonJS distribution
export let cjsDistDir = publishDir + '/dist/cjs';
export let mjsDistDir = publishDir + '/dist/mjs';
// Timeout for tests
export let mochaTimeout = 2000;

// Sometimes things don't go right, for example cacheable-request is incompatible with other packages, and we don't use it anyways
const unwantedFiles = [
  './node_modules/@types/cacheable-request'
];

// Setters
export const setGenerateCommonJS = function (flag) {
  generateCommonJS = flag;
};
export const setCleanTranspiled = function (flag) {
  cleanCjsTranspilation = flag;
};
export const setMainBranch = function (branch) {
  mainBranch = branch;
};
export const setMochaTimeout = function (_timeout) {
  mochaTimeout = _timeout;
};

export const setGitTimeout = function (_timeout) {
  gitTimeout = _timeout;
};

export const setNpmTimeout = function (_timeout) {
  npmTimeout = _timeout;
};

// Init for package json and files
export function init(_packageJson, _packageDistJson,  _gitTimeout = 100, _npmTimeout = 5000, _mainBranch) {
  gitTimeout = _gitTimeout;
  npmTimeout = _npmTimeout;
  packageJson = _packageJson;
  packageDistJSon = _packageDistJson;
  mainBranch = _mainBranch;
}

// Tasks
export function cleanTesting(cb) {
  deleteSync(testingCjsDir);
  deleteSync(testingMjsDir);
  cb();
}

export function cleanUnwantedFiles(cb) {
  deleteSync(unwantedFiles);
  cb();
}

export function cleanBuild(cb) {
  deleteSync(buildCjsDir);
  deleteSync(buildMjsDir);
  cb();
}


export function cleanPublish(cb) {
  deleteSync(publishDir);
  cb();
}

// Transpile source.  Project files should point to respective build folders.
export function tscTsSrc(cb) {
  let result;
  if (generateCommonJS) {
    result = execSync('tsc --project ' + tsConfigBuildCjsFileName, {cwd: './', stdio: 'inherit'});
    if (result) {
      console.log(result);
    }
  }
  result = execSync('tsc --project ' + tsConfigBuildMjsFileName, {cwd: './', stdio: 'inherit'});
  if (result) {
    console.log(result);
  }
  cb();
}

// Transpile tests.  Project files should point to respective testing folders
export function tscTsTest(cb) {
  let result;
  if (generateCommonJS) {
    result = execSync('tsc --project ' + tsConfigBuildTestCjsFileName, {cwd: './', stdio: 'inherit'});
    if (result) {
      console.log(result);
    }
  }
  result = execSync('tsc --project ' + tsConfigBuildTestMjsFileName, {cwd: './', stdio: 'inherit'});
  if (result) {
    console.log(result);
  }
  cb();
}

// Clean cjs files of the unwanted export {}
export function cleanTranspiledSrc(cb) {
  if (cleanCjsTranspilation) {
    if (generateCommonJS) {
      src([buildCjsDir + '/**/*.cjs'])
        .pipe(replace(/export\s*{};/g, ''))
        .pipe(dest(buildCjsDir));
    }
    return src([buildMjsDir + '/**/*.cjs'])
      .pipe(replace(/export\s*{};/g, ''))
      .pipe(dest(buildMjsDir));
  } else {
    cb();
  }
}

// Clean cjs files of the unwanted export {}
export function cleanTranspiledTest(cb) {
  if (cleanCjsTranspilation) {
    if (generateCommonJS) {
      src([testingCjsDir + '/**/*.cjs'])
        .pipe(replace(/export\s*{};/g, ''))
        .pipe(dest(testingCjsDir));
    }
    return src([testingMjsDir + '/**/*.cjs'])
      .pipe(replace(/export\s*{};/g, ''))
      .pipe(dest(testingMjsDir));
  } else {
    cb();
  }
}

// Copy Javascript and any standalone type definitions to build
export function copySrcJsToBuildDir() {
  if (generateCommonJS) {
    src([tsSrcDir + '/**/*.js', tsSrcDir + '/**/*.mjs', tsSrcDir + '/**/*.cjs', tsSrcDir + '/**/*.d.ts', tsSrcDir + '/**/*.d.mts', tsSrcDir + '/**/*.d.cts'])
      .pipe(dest(buildCjsDir));
  }
  return src([tsSrcDir + '/**/*.js', tsSrcDir + '/**/*.mjs', tsSrcDir + '/**/*.cjs', tsSrcDir + '/**/*.d.ts', tsSrcDir + '/**/*.d.mts', tsSrcDir + '/**/*.d.cts'])
    .pipe(dest(buildMjsDir));
}

// Copy Javascript tests to testing
export function copyTestJsToTestingDir() {
  if (generateCommonJS) {
    src([tsTestDir + '/**/*.js', tsTestDir + '/**/*.cjs', tsTestDir + '/**/*.mjs'])
      .pipe(dest(testingCjsDir));
  }
  return src([tsTestDir + '/**/*.js', tsTestDir + '/**/*.cjs', tsTestDir + '/**/*.mjs'])
    .pipe(dest(testingMjsDir));
}

// Copy supporting JSON to build directories
export function copyJsonToBuildDir() {
  if (generateCommonJS) {
    src([tsSrcDir + '/**/*.json'])
      .pipe(dest(buildCjsDir));
  }
  return src([tsSrcDir + '/**/*.json'])
    .pipe(dest(buildMjsDir));
}

// Copy JSON supporting tests
export function copyJsonToTestingDir(cb) {
  if (generateCommonJS) {
    src([tsTestDir + '/**/*.json'])
      .pipe(dest(testingCjsDir));
  }
  return src([tsTestDir + '/**/*.json'])
    .pipe(dest(testingMjsDir));
}

// Copy JSON to distributions
export function copyBuildJsonToPublishDir() {
  if (generateCommonJS) {
    src([buildCjsDir + '/**/*.json'])
      .pipe(dest(cjsDistDir));
  }
  return src([buildMjsDir + '/**/*.json'])
    .pipe(dest(mjsDistDir));
}

// Copy wikis
export function copySrcMdToPublishDir() {
  if (generateCommonJS) {
    src([tsSrcDir + '/**/*.md', './*.md'])
      .pipe(dest(cjsDistDir));
  }
  return src([tsSrcDir + '/**/*.md', './*.md'])
    .pipe(dest(mjsDistDir));
}

// DELETE
//export function copySrcJsToReleaseDir ()  {
//  return src([jsSrcDir + '/**/*.js', jsSrcDir + '/**/*.mjs', jsSrcDir + '/**/*.cjs'])
//    .pipe(dest(releaseDir));
//};


// Copy all Javascript to publish distributions
export function copyBuildJsToPublishDir() {
  if (generateCommonJS) {
    src([buildCjsDir + '/**/*.js', buildCjsDir + '/**/*.cjs', buildCjsDir + '/**/*.mjs'])
      .pipe(dest(cjsDistDir));
  }
  return src([buildMjsDir + '/**/*.js', buildMjsDir + '/**/*.cjs', buildMjsDir + '/**/*.mjs'])
    .pipe(dest(mjsDistDir));
}

// Copy type declarations
export function copyBuildTypescriptDeclarationToPublishDir() {
  if (generateCommonJS) {
    src([buildCjsDir + '/**/*.d.ts', buildCjsDir + '/**/*.d.mts', buildCjsDir + '/**/*.d.cts'])
      .pipe(dest(cjsDistDir));
  }
  return src([buildMjsDir + '/**/*.d.ts', buildMjsDir + '/**/*.d.mts', buildMjsDir + '/**/*.d.cts'])
    .pipe(dest(mjsDistDir));
}
// Copy the package JSON file to the distribution folders
export function copyPackageJsonsToPublishDir(cb) {
  
  try {
    fs.mkdirSync(publishDir);
  } catch (error) {
    if(error.code !== 'EEXIST') {
      cb(error);
    }
  }
  try {
    fs.mkdirSync(`${publishDir}/dist`);
  } catch (error) {
    if(error.code !== 'EEXIST') {
      cb(error);
    }
  }
  try {
    fs.mkdirSync(cjsDistDir);
  } catch (error) {
    if(error.code !== 'EEXIST') {
      cb(error);
    }
  }
  try {
    fs.mkdirSync(mjsDistDir);
  } catch (error) {
    if(error.code !== 'EEXIST') {
      cb(error);
    }
  }
 
  delete packageJson.type;
  
  const cjsPackageJson = _.merge({}, packageDistJSon, {type: 'commonjs'});
  const mjsPackageJson = _.merge({}, packageDistJSon, {type: 'module'});
  
  // Write the dist package.json as well as the publish one
  fs.writeFileSync(publishDir + '/package.json', JSON.stringify(packageJson, null, 2));
  fs.writeFileSync(cjsDistDir + '/package.json', JSON.stringify(cjsPackageJson, null, 2));
  fs.writeFileSync(mjsDistDir + '/package.json', JSON.stringify(mjsPackageJson, null, 2));
  fs.writeFileSync(testingCjsDir + '/package.json', JSON.stringify(cjsPackageJson, null, 2));
  cb();
}

// Increment patch version
export function incrementJsonPatch(cb) {
  let version = packageJson.version;
  const semver = version.split('.');
  if (semver.length === 3) {
    console.log('Old package version: ', packageJson.version);
    let patchVersion = parseInt(semver[2], 10) + 1;
    packageJson.version = semver[0] + '.' + semver[1] + '.' + patchVersion;
    console.log('New package version: ' + packageJson.version);
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  }
  cb();
}

// Increment minor version
export function incrementJsonMinor(cb) {
  let version = packageJson.version;
  const semver = version.split('.');
  if (semver.length === 3) {
    console.log('Old package version: ', packageJson.version);
    let minorVersion = parseInt(semver[1], 10) + 1;
    packageJson.version = semver[0] + '.' + minorVersion + '.0';
    console.log('New package version: ' + packageJson.version);
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  }
  cb();
}

// Increment major version
export function incrementJsonMajor(cb) {
  let version = packageJson.version;
  const semver = version.split('.');
  if (semver.length === 3) {
    console.log('Old package version: ', packageJson.version);
    let majorVersion = parseInt(semver[0], 10) + 1;
    packageJson.version = majorVersion + '.0.0';
    console.log('New package version: ' + packageJson.version);
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  }
  cb();
}

// Public
export function publish(cb) {
  console.log(`npm publish ${publishDir}`);
  const result = execSync(`npm publish ${publishDir}`, {});
  console.log(result.toString('utf-8'));
  console.log(`Setting npm post-publish delay of ${npmTimeout} millis`);
  setTimeout(() => {
    cb();
  }, npmTimeout);
}


export function cleanGitStatus(data) {
  const fileDescriptions = data.split('\n');
  let uncommittedFiles = [];
  fileDescriptions.forEach(line => {
    if (line.length > 0) {
      const fileDescription = line.split(' ');
      uncommittedFiles.push(fileDescription[fileDescription.length - 1]);
    }
  });
  // console.log({uncommittedFiles:uncommittedFiles});
  return uncommittedFiles;
}

// Git
function statusCode() {
  return new Promise((success, error) => {
    git.status({args: '--porcelain'}, (err, stdout) => {
      success(cleanGitStatus(stdout));
    });
  });
}

// Git
export async function gitCheckIn(cb) {
  const args = minimist(process.argv.slice(2));
  if (args.m && args.m.trim().length > 0) {
    let files = await statusCode();
    return src(files)
      .pipe(git.add())
      .pipe(git.commit(args.m));
  } else return Promise.reject('No source comment');
}

// Git
export function gitAdd(cb) {
  statusCode()
    .then(files => {
      return src(files)
        .pipe(git.add());
    })
    .then(result => {
      setTimeout(() => {
        console.log('Awaiting ' + gitTimeout + 'ms.  Next line should be \"Finished \'gitAdd\'\" If Add activity continues beyond this limit adjust through gitbase.init');
        cb();
      }, gitTimeout);
    })
    .catch(err => {
      console.log(err, err.stack);
      cb();
    });
}

// Git
export function gitCommit(cb) {
  const args = minimist(process.argv.slice(2));
  if (args.m && args.m.trim().length > 0) {
    statusCode()
      .then(files => {
        return src(files)
          .pipe(git.commit(args.m));
      })
      .then(result => {
        setTimeout(() => {
          console.log('Awaiting ' + gitTimeout + 'ms.  Next line should be \"Finished \'gitCommit\'\" If Add activity continues beyond this limit adjust through gitbase.init');
          cb();
        }, gitTimeout);
      })
      .catch(err => {
        console.log(err, err.stack);
        cb();
      });
  } else {
    let err = new Error('No source comment');
    console.log(err, err.stack);
    throw err;
  }
}

// GIt
export function gitPush(cb) {
  console.log('Pushing to ' + mainBranch);
  git.push('origin', mainBranch, function (err) {
    if (err) throw err;
    cb();
  });
}


export function runCommonJSTests() {
  if (generateCommonJS) {
    return src([`${testingCjsDir}/**/*.test.js`, `${testingCjsDir}/**/*.test.mjs`, `${testingCjsDir}/**/*.test.cjs`])
      .pipe(mocha({timeout: mochaTimeout}));
  }
}

export function runES6Test() {
  return src([`${testingMjsDir}/**/*.test.js`, `${testingMjsDir}/**/*.test.mjs`, `${testingMjsDir}/**/*.test.cjs`])
    .pipe(mocha({timeout: mochaTimeout}));
}

export function runTests() {
  if (generateCommonJS) {
    runCommonJSTests();
  }
  return runES6Test();
}

export const testCommonJS = gulp.series(
  runCommonJSTests
);

export const testES6 = gulp.series(
  runES6Test
);

export const test = gulp.series(
  runTests
);

export const buildTest = gulp.series(
  cleanTesting,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  tscTsTest,
  cleanTranspiledTest,
  runTests
);

export default gulp.series(
  cleanUnwantedFiles,
  cleanPublish,
  cleanBuild,
  cleanTesting,
  tscTsSrc,
  cleanTranspiledSrc,
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  copyBuildJsonToPublishDir,
  tscTsTest,// Must be transpiled after publish dir as it refers to publish index.d.ts
  cleanTranspiledTest,
  copyPackageJsonsToPublishDir,
  runTests);

export const clean = gulp.series(
  cleanUnwantedFiles,
  cleanPublish,
  cleanBuild,
  cleanTesting
);

export const patch = gulp.series(
  cleanUnwantedFiles,
  cleanPublish,
  cleanBuild,
  cleanTesting,
  tscTsSrc,
  cleanTranspiledSrc,
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  copyBuildJsonToPublishDir,
  tscTsTest, // Must be transpiled after publish dir as it refers to publish index.d.ts
  cleanTranspiledTest,
  incrementJsonPatch,
  copyPackageJsonsToPublishDir,
  runTests,
  publish,
  gitAdd,
  gitCommit,
  gitPush);


export const minor = gulp.series(
  cleanUnwantedFiles,
  cleanPublish,
  cleanBuild,
  cleanTesting,
  tscTsSrc,
  cleanTranspiledSrc,
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  tscTsTest, // Must be transpiled after publish dir as it refers to publish index.d.ts
  cleanTranspiledTest,
  incrementJsonMinor,
  copyPackageJsonsToPublishDir,
  runTests,
  publish,
  gitAdd,
  gitCommit,
  gitPush);

export const major = gulp.series(
  cleanUnwantedFiles,
  cleanPublish,
  cleanBuild,
  cleanTesting,
  tscTsSrc,
  cleanTranspiledSrc,
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  copyBuildJsonToPublishDir,
  tscTsTest, // Must be transpiled after publish dir as it refers to publish index.d.ts
  cleanTranspiledTest,
  incrementJsonMajor,
  copyPackageJsonsToPublishDir,
  runTests,
  publish,
  gitAdd,
  gitCommit,
  gitPush);
