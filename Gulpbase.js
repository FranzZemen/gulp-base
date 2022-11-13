import {execSync} from 'child_process';
import {deleteSync} from 'del';
import * as fs from 'fs';
import gulp from 'gulp';
import gulpGit from 'gulp-git';
import {simpleGit} from 'simple-git';
import mocha from 'gulp-mocha';
import {default as replace} from 'gulp-replace';
import _ from 'lodash';
import minimist from 'minimist';
import {createRequire} from 'module';
import {join} from 'path';
import mergeStream from 'merge-stream';

const src = gulp.src;
const dest = gulp.dest;

export {npmUpdateProject} from './npm-commands.js';

const requireModule = createRequire(import.meta.url);
const loadJSON = requireModule;

/**********  Declarations **********/

let generateCommonJS = true;
let generateES = true;
let executeCommonJSTests = true;
// When transpiling Cjs files, an export {} appears at the end.  Lots of threads on this.  For us, we just clean it out.
// However, we shouldn't be transpiling to .cjs with our bi-loader build (commonjs and cjs)
let cleanCjsTranspilation = true;
// The top level package.json as an object
let packageJson = null;
// Timeout for git
let gitTimeout = null;
// We want to wait after an NPM publish to support npmu as (especially on Sundays) npm is slow to make freshly published packages visible
let npmTimeout = null;

// ts-config file for commonjs processing.  We do NOT use .cts files and .mts files
let tsConfigBuildCjsFileName = './tsconfig.build-cjs.json';
let tsConfigBuildCjs;
// ts-config file for es processing.  We do NOT use .cts and .mts files.
let tsConfigBuildMjsFileName = './tsconfig.build-mjs.json';
let tsConfigBuildMjs;
// ts-config file for commonjs processing.
let tsConfigBuildTestCjsFileName = './tsconfig.build-test-cjs.json';
let tsConfigBuildTestCjs;
// ts-config file for es processing
let tsConfigBuildTestMjsFileName = './tsconfig.build-test-mjs.json';
let tsConfigBuildTestMjs;

// Source folder
export let cwd = null;
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

export const setExecuteCommonJSTests = function (flag) {
  executeCommonJSTests = flag;
};
export const setGenerateES = function (flag) {
  generateES = flag;
};
export const setCleanTranspiled = function (flag) {
  cleanCjsTranspilation = flag;
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

export const setCwd = function (_cwd) {
  cwd = _cwd;
};

/********** Set gitBranch for push to origin **********/
const gitOptions = {
  baseDir: process.cwd(),
  binary: 'git',
  maxConcurrentProcesses: 6,
  trimmed: false
};
const git = simpleGit(gitOptions);

const branches = await git.branchLocal();
// The main branch, but will change to the current branch if it is not the main one
export let gitBranch = 'main';

if (branches && branches.current) {
  gitBranch = branches.current;
}

/********** Initialization - must always be called **********/

export function init(_packageJson, _cwd, _gitTimeout = 100, _npmTimeout = 5000) {
  gitTimeout = _gitTimeout;
  npmTimeout = _npmTimeout;
  packageJson = _packageJson;
  cwd = _cwd;
  
  tsConfigBuildCjs = loadJSON(join(cwd, tsConfigBuildCjsFileName));
  tsConfigBuildMjs = loadJSON(join(cwd, tsConfigBuildMjsFileName));
  tsConfigBuildTestCjs = loadJSON(join(cwd, tsConfigBuildTestCjsFileName));
  tsConfigBuildTestMjs = loadJSON(join(cwd, tsConfigBuildTestMjsFileName));
}

/********** Cleaning Tasks **********/

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

export function cleanAll(cb) {
  cleanTesting((err) => err ? cb(err) : undefined);
  cleanPublish((err) => err ? cb(err) : undefined);
  cleanBuild((err) => err ? cb(err) : undefined);
  cb();
}

// Clean cjs files of the unwanted export {}
export function cleanTranspiledSrc(cb) {
  if (cleanCjsTranspilation) {
    if (generateCommonJS) {
      return src([buildCjsDir + '/**/*.cjs'])
        .pipe(replace(/export\s*{};/g, ''))
        .pipe(dest(buildCjsDir));
    }
  }
  cb();
}

// Clean cjs files of the unwanted export {}
export function cleanTranspiledTest(cb) {
  if (cleanCjsTranspilation) {
    if (generateCommonJS) {
      return src([testingCjsDir + '/**/*.cjs'])
        .pipe(replace(/export\s*{};/g, ''))
        .pipe(dest(testingCjsDir));
    }
  }
  cb();
}

/********** Transpilation **********/

// Transpile source.  Project files should point to respective build folders.
export function tscTsSrc(cb) {
  let result;
  if (generateCommonJS) {
    result = execSync('tsc --project ' + tsConfigBuildCjsFileName, {cwd: './', stdio: 'inherit'});
    if (result) {
      console.log(result);
    }
  }
  if (generateES) {
    result = execSync('tsc --project ' + tsConfigBuildMjsFileName, {cwd: './', stdio: 'inherit'});
    if (result) {
      console.log(result);
    }
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
  if (generateES) {
    result = execSync('tsc --project ' + tsConfigBuildTestMjsFileName, {cwd: './', stdio: 'inherit'});
    if (result) {
      console.log(result);
    }
  }
  cb();
}

/********** Move static (not transpiled/transformed files to build directories **********/

// Copy Javascript and any standalone type definitions to build
export function copySrcJsToBuildDir(cb) {
  let stream1, stream2;
  if (generateCommonJS) {
    stream1 = src([tsSrcDir + '/**/*.js', tsSrcDir + '/**/*.mjs', tsSrcDir + '/**/*.cjs', tsSrcDir + '/**/*.d.ts', tsSrcDir + '/**/*.d.mts', tsSrcDir + '/**/*.d.cts'])
      .pipe(dest(buildCjsDir));
  }
  if (generateES) {
    stream2 = src([tsSrcDir + '/**/*.js', tsSrcDir + '/**/*.mjs', tsSrcDir + '/**/*.cjs', tsSrcDir + '/**/*.d.ts', tsSrcDir + '/**/*.d.mts', tsSrcDir + '/**/*.d.cts'])
      .pipe(dest(buildMjsDir));
  }
  if (stream1) {
    if (stream2) {
      return mergeStream(stream1, stream2);
    } else {
      return stream1;
    }
  } else if (stream2) {
    return stream2;
  } else {
    cb();
  }
}

// Copy supporting JSON to build directories
export function copyJsonToBuildDir(cb) {
  let stream1, stream2;
  if (generateCommonJS) {
    stream1 = src([tsSrcDir + '/**/*.json'])
      .pipe(dest(buildCjsDir));
  }
  if (generateES) {
    stream2 = src([tsSrcDir + '/**/*.json'])
      .pipe(dest(buildMjsDir));
  }
  if (stream1) {
    if (stream2) {
      return mergeStream(stream1, stream2);
    } else {
      return stream1;
    }
  } else if (stream2) {
    return stream2;
  } else {
    cb();
  }
}

export function copyStaticToBuildDir(cb) {
  let stream1 = copySrcJsToBuildDir((err) => err ? cb(err) : undefined);
  let stream2 = copyJsonToBuildDir((err) => err ? cb(err) : undefined);
  if (stream1) {
    if (stream2) {
      return mergeStream(stream1, stream2);
    } else {
      return stream1;
    }
  } else if (stream2) {
    return stream2;
  } else {
    cb();
  }
}

/********** Move static (not transpiled/transformed files to test directories **********/

// Copy Javascript tests to testing
export function copyTestJsToTestingDir(cb) {
  let stream1, stream2;
  if (generateCommonJS) {
    stream1 = src([tsTestDir + '/**/*.js', tsTestDir + '/**/*.cjs', tsTestDir + '/**/*.mjs'])
      .pipe(dest(testingCjsDir));
  }
  if (generateES) {
    stream2 = src([tsTestDir + '/**/*.js', tsTestDir + '/**/*.cjs', tsTestDir + '/**/*.mjs'])
      .pipe(dest(testingMjsDir));
  }
  if (stream1) {
    if (stream2) {
      return mergeStream(stream1, stream2);
    } else {
      return stream1;
    }
  } else if (stream2) {
    return stream2;
  } else {
    cb();
  }
}

// Copy JSON supporting tests
export function copyJsonToTestingDir(cb) {
  let stream1, stream2;
  if (generateCommonJS) {
    stream1 = src([tsTestDir + '/**/*.json'])
      .pipe(dest(testingCjsDir));
  }
  if (generateES) {
    stream2 = src([tsTestDir + '/**/*.json'])
      .pipe(dest(testingMjsDir));
  }
  if (stream1) {
    if (stream2) {
      return mergeStream(stream1, stream2);
    } else {
      return stream1;
    }
  } else if (stream2) {
    return stream2;
  } else {
    cb();
  }
}

export function copyStaticToTestingDir(cb) {
  let stream1 = copyTestJsToTestingDir(cb);
  let stream2 = copyJsonToTestingDir(cb);
  if (stream1) {
    if (stream2) {
      return mergeStream(stream1, stream2);
    } else {
      return stream1;
    }
  } else if (stream2) {
    return stream2;
  } else {
    cb();
  }
}

/********** Copy Static To Publish **********/

// Copy wikis
export function copySrcMdToPublishDir(cb) {
  let stream1, stream2;
  if (generateCommonJS) {
    stream1 = src([tsSrcDir + '/**/*.md', './*.md'])
      .pipe(dest(cjsDistDir));
  }
  if (generateES) {
    stream2 = src([tsSrcDir + '/**/*.md', './*.md'])
      .pipe(dest(mjsDistDir));
  }
  if (stream1) {
    if (stream2) {
      return mergeStream(stream1, stream2);
    } else {
      return stream1;
    }
  } else if (stream2) {
    return stream2;
  } else {
    cb();
  }
}

// Copy type declarations
export function copyBuildTypescriptDeclarationToPublishDir(cb) {
  let stream1, stream2;
  if (generateCommonJS) {
    stream1 = src([buildCjsDir + '/**/*.d.ts', buildCjsDir + '/**/*.d.mts', buildCjsDir + '/**/*.d.cts'])
      .pipe(dest(cjsDistDir));
  }
  if (generateES) {
    stream2 = src([buildMjsDir + '/**/*.d.ts', buildMjsDir + '/**/*.d.mts', buildMjsDir + '/**/*.d.cts'])
      .pipe(dest(mjsDistDir));
  }
  if (stream1) {
    if (stream2) {
      return mergeStream(stream1, stream2);
    } else {
      return stream1;
    }
  } else if (stream2) {
    return stream2;
  } else {
    cb();
  }
}

// Copy all Javascript to publish distributions
export function copyBuildJsToPublishDir(cb) {
  let stream1, stream2;
  if (generateCommonJS) {
    stream1 = src([buildCjsDir + '/**/*.js', buildCjsDir + '/**/*.cjs', buildCjsDir + '/**/*.mjs'])
      .pipe(dest(cjsDistDir));
  }
  if (generateES) {
    stream2 = src([buildMjsDir + '/**/*.js', buildMjsDir + '/**/*.cjs', buildMjsDir + '/**/*.mjs'])
      .pipe(dest(mjsDistDir));
  }
  if (stream1) {
    if (stream2) {
      return mergeStream(stream1, stream2);
    } else {
      return stream1;
    }
  } else if (stream2) {
    return stream2;
  } else {
    cb();
  }
}

// Copy JSON to distributions
export function copyBuildJsonToPublishDir(cb) {
  let stream1, stream2;
  if (generateCommonJS) {
    stream1 = src([buildCjsDir + '/**/*.json'])
      .pipe(dest(cjsDistDir));
  }
  if (generateES) {
    stream2 = src([buildMjsDir + '/**/*.json'])
      .pipe(dest(mjsDistDir));
  }
  if (stream1) {
    if (stream2) {
      return mergeStream(stream1, stream2);
    } else {
      return stream1;
    }
  } else if (stream2) {
    return stream2;
  } else {
    cb();
  }
}

// Copy the package JSON file to the distribution folders
export function copyPackageJsonsToPublishDir(cb) {
  try {
    fs.mkdirSync(publishDir);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      cb(error);
    }
  }
  try {
    fs.mkdirSync(`${publishDir}/dist`);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      cb(error);
    }
  }
  if (generateCommonJS) {
    try {
      fs.mkdirSync(cjsDistDir);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        cb(error);
      }
    }
  }
  if (generateES) {
    try {
      fs.mkdirSync(mjsDistDir);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        cb(error);
      }
    }
  }
  if (generateCommonJS) {
    try {
      fs.mkdirSync(testingCjsDir);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        cb(error);
      }
    }
  }
  
  const baseJson = _.merge({}, packageJson);
  // Remote the type for publishing
  delete baseJson.type;
  // Remove some top level properties, which would have the wrong paths for publishing
  delete baseJson.main;
  delete baseJson.module;
  delete baseJson.types;
  delete baseJson.exports;
  
  
  const publishSpec = {
    main: 'dist/cjs/index.js',
    module: 'dist/mjs/index.js',
    types: 'dist/mjs/index.d.ts',
    exports: {
      '.': {
        'import': './dist/mjs/index.js',
        'require': './dist/cjs/index.js'
      }
    }
  };
  
  const packageDistJson = _.merge({}, baseJson);
  
  const publishPackageJson = _.merge({}, baseJson, publishSpec);
  let cjsPackageJson;
  if (generateCommonJS) {
    cjsPackageJson = _.merge({}, packageDistJson, {type: 'commonjs'});
  }
  let mjsPackageJson;
  if (generateES) {
    mjsPackageJson = _.merge({}, packageDistJson, {type: 'module'});
  }
  
  // Write the dist package.json as well as the publish one
  fs.writeFileSync(publishDir + '/package.json', JSON.stringify(publishPackageJson, null, 2));
  if (generateCommonJS) {
    fs.writeFileSync(cjsDistDir + '/package.json', JSON.stringify(cjsPackageJson, null, 2));
  }
  if (generateES) {
    fs.writeFileSync(mjsDistDir + '/package.json', JSON.stringify(mjsPackageJson, null, 2));
  }
  cb();
}

export function copyStaticAndGeneratedToPublishDir(cb) {
  let streams = [];
  let stream1 = copySrcMdToPublishDir((err) => err ? cb(err) : undefined);
  if (stream1) streams.push(stream1);
  let stream2 = copyBuildTypescriptDeclarationToPublishDir((err) => err ? cb(err) : undefined);
  if (stream2) streams.push(stream2);
  let stream3 = copyBuildJsToPublishDir((err) => err ? cb(err) : undefined);
  if (stream3) streams.push(stream3);
  let stream4 = copyBuildJsonToPublishDir((err) => err ? cb(err) : undefined);
  if (stream4) streams.push(stream4);
  copyPackageJsonsToPublishDir((err) => err ? cb(err) : undefined);
  if (streams.length > 0) {
    return mergeStream(...streams);
  }
  cb();
}

/********** Publishing Functions **********/

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
    gulpGit.status({args: '--porcelain'}, (err, stdout) => {
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
      .pipe(gulpGit.add({args: '--all'}))
      .pipe(gulpGit.commit(args.m));
  } else return Promise.reject('No source comment');
}

// Git
export function gitAdd(cb) {
  return statusCode()
    .then(async files => {
      const stream = src(files, {'allowEmpty': true})
        .pipe(gulpGit.add({args: '--all'}));
      await new Promise(fulfill => stream.on('finish', fulfill));
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
          .pipe(gulpGit.commit(args.m));
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
  console.log('Pushing to ' + gitBranch);
  gulpGit.push('origin', gitBranch, function (err) {
    if (err) throw err;
    cb();
  });
}


export function runCommonJSTests(cb) {
  console.log('Running CommonJS tests...');
  if (generateCommonJS && executeCommonJSTests) {
    // Need to change the type on the root package.json to commonjs for the tests
    packageJson.type = 'commonjs';
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
    return src([`${testingCjsDir}/**/*.test.js`, `${testingCjsDir}/**/*.test.mjs`, `${testingCjsDir}/**/*.test.cjs`])
      .pipe(mocha({timeout: mochaTimeout}))
      .on('error', () => {
        packageJson.type = 'commonjs';
        fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
      });
  }
  cb();
}

export function runES6Test(cb) {
  console.log('Running ES tests...');
  // Ensure packageJSON is back to module
  packageJson.type = 'module';
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  
  if (generateES) {
    return src([`${testingMjsDir}/**/*.test.js`, `${testingMjsDir}/**/*.test.mjs`, `${testingMjsDir}/**/*.test.cjs`])
      .pipe(mocha({timeout: mochaTimeout}));
  }
  cb();
}


export const test = gulp.series(
  runCommonJSTests,
  runES6Test
);

export const buildTest = gulp.series(
  cleanTesting,
  copyStaticToTestingDir,
  tscTsTest,
  cleanTranspiledTest,
  runCommonJSTests,
  runES6Test
);

export default gulp.series(
  cleanUnwantedFiles,
  cleanAll,
  tscTsSrc,
  cleanTranspiledSrc,
  copyStaticToBuildDir,
  copyStaticToTestingDir,
  copyStaticAndGeneratedToPublishDir,
  tscTsTest,// Must be transpiled after publish dir as it refers to publish index.d.ts
  cleanTranspiledTest,
  runCommonJSTests,
  runES6Test);

export const clean = gulp.series(
  cleanUnwantedFiles,
  cleanAll
);

export const patch = gulp.series(
  cleanUnwantedFiles,
  cleanAll,
  tscTsSrc,
  cleanTranspiledSrc,
  copyStaticToBuildDir,
  copyStaticToTestingDir,
  copyStaticAndGeneratedToPublishDir,
  tscTsTest, // Must be transpiled after publish dir as it refers to publish index.d.ts
  cleanTranspiledTest,
  incrementJsonPatch,
  runCommonJSTests,
  runES6Test,
  publish,
  gitAdd,
  gitCommit,
  gitPush);


export const minor = gulp.series(
  cleanUnwantedFiles,
  cleanAll,
  tscTsSrc,
  cleanTranspiledSrc,
  copyStaticToBuildDir,
  copyStaticToTestingDir,
  copyStaticAndGeneratedToPublishDir,
  tscTsTest, // Must be transpiled after publish dir as it refers to publish index.d.ts
  cleanTranspiledTest,
  incrementJsonMinor,
  runCommonJSTests,
  runES6Test,
  publish,
  gitAdd,
  gitCommit,
  gitPush);

export const major = gulp.series(
  cleanUnwantedFiles,
  cleanAll,
  tscTsSrc,
  cleanTranspiledSrc,
  copyStaticToBuildDir,
  copyStaticToTestingDir,
  copyStaticAndGeneratedToPublishDir,
  tscTsTest, // Must be transpiled after publish dir as it refers to publish index.d.ts
  cleanTranspiledTest,
  incrementJsonMajor,
  runCommonJSTests,
  runES6Test,
  publish,
  gitAdd,
  gitCommit,
  gitPush);

