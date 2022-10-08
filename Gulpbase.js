import { createRequire } from "module";
import gulp from 'gulp';
const src = gulp.src;
const dest = gulp.dest;
import {deleteSync} from 'del';
import {exec, execSync} from 'child_process';
import * as fs from 'fs';
import * as zip from 'gulp-zip';
import * as path from 'path';
import minimist from 'minimist';
import git from 'gulp-git';
import debug from 'gulp-debug';
import merge from 'merge-stream';
import mocha from 'gulp-mocha';
import {npmInstallProject} from './npm-commands.js';
export {npmUpdateProject} from './npm-commands.js';
import {ncuu} from './ncu.js';


const requireModule = createRequire(import.meta.url);


let packageJson = null;
let gitTimeout = null;
let npmTimeout = null;
let tsConfigSrcJsonFileName = null;
let tsConfigSrcJson = null;
let tsConfigTestJsonFileName = null;
let tsConfigTestJson = null;
let unscopedName = null;
export let mainBranch = 'master'; // most repos still using master, later move this to main

// These constants are defined in the package's tsconfig.*.json, and set through the init method.
export let tsSrcDir = null;
export let buildDir = null;
export let tsTestDir = null;
export let testingDir = null;


export let srcDir = './src';
export let testDir = './test';
export let releaseDir = './release';
export let publishDir = './publish';

export let mochaTimeout = 2000;
const lambdaLayerDir = buildDir + '/nodejs';

const unwantedFiles = [
  './node_modules/@types/cacheable-request'
]


export const setMainBranch = function(branch) {
  mainBranch = branch;
}

export const setSrcDir = function(dir) {
  srcDir = dir;
}


export const setTestDir = function (dir) {
  testDir = dir;
}


export const setReleaseDir = function (dir) {
  releaseDir = dir;
}


export const setPublishDir = function (dir) {
  publishDir = dir;
}


export const setMochaTimeout = function(_timeout) {
  mochaTimeout = _timeout;
}

export const setGitTimeout = function(_timeout) {
  gitTimeout = _timeout;
}

export const setNpmTimeout = function(_timeout) {
  npmTimeout = _timeout;
}


export function init(packageName, _tsConfigSrcJsonFileName, _tsConfigTestJsonFilename, _gitTimeout=100, _npmTimeout = 10000) {
  gitTimeout = _gitTimeout;
  npmTimeout = _npmTimeout;
  packageJson = packageName;
  unscopedName = path.parse(packageJson.name).name;
  
  tsConfigSrcJsonFileName = _tsConfigSrcJsonFileName
  tsConfigTestJsonFileName = _tsConfigTestJsonFilename
  tsConfigSrcJson = requireModule(tsConfigSrcJsonFileName);
  tsConfigTestJson = requireModule(tsConfigTestJsonFileName);
  tsSrcDir = tsConfigSrcJson.compilerOptions.rootDir;
  buildDir = tsConfigSrcJson.compilerOptions.outDir;
  tsTestDir = tsConfigTestJson.compilerOptions.rootDir;
  testingDir = tsConfigTestJson.compilerOptions.outDir;
}

export function cleanTesting(cb) {
  deleteSync(testingDir);
  cb();
}

export function cleanUnwantedFiles(cb) {
  deleteSync(unwantedFiles);
  cb();
}

export function cleanBuild(cb) {
  deleteSync(buildDir);
  cb();
}

export function cleanRelease(cb) {
  deleteSync(releaseDir);
  cb();
}

export function cleanPublish(cb) {
  deleteSync(publishDir);
  cb();
}

export function tscTsSrc(cb) {
  const result = execSync('tsc --project ' + tsConfigSrcJsonFileName, {cwd: './', stdio: 'inherit'});
  if(result) {
    console.log(result);
  }
  cb();
}

export function tscTsTest(cb) {
  const result = execSync('tsc --project ' + tsConfigTestJsonFileName, {cwd: './', stdio: 'inherit'});
  if(result) {
    console.log(result);
  }
  cb();
}

export function copyTestJsToTestingDir() {
  return src([testDir + '/**/*.js',testDir + '/**/*.cjs',testDir + '/**/*.mjs'])
    .pipe(dest(testingDir));
}

export function copyJsonToTestingDir() {
  return src([testDir + '/**/*.json', tsTestDir + '/**/*.json'])
    .pipe(dest(testingDir));
}

export function copySecretsToTestingDir() {
  return src([testDir + '/**/*.pem', tsTestDir + '/**/*.pem'])
    .pipe(dest(testingDir));
}

export function copyJsonToBuildDir() {
  return src([srcDir + '/**/*.json', tsSrcDir + '/**/*.json'])
    .pipe(dest(buildDir));
}

export function copyBuildJsonToPublishDir() {
  return src([buildDir + '/**/*.json'])
    .pipe(dest(publishDir));
}

export function copySrcJsToBuildDir() {
  return src([srcDir + '/**/*.js', srcDir + '/**/*.mjs', srcDir + '/**/*.cjs', srcDir + '/**/*.d.ts', srcDir + '/**/*.d.mts', srcDir + '/**/*.d.cts'])
    .pipe(dest(buildDir));
}

export function copySrcJsToReleaseDir ()  {
  return src([srcDir + '/**/*.js', srcDir + '/**/*.mjs', srcDir + '/**/*.cjs'])
    .pipe(dest(releaseDir));
};

export function copyBuildJsToPublishDir() {
  return src([buildDir + '/**/*.js', buildDir + '/**/*.cjs', buildDir + '/**/*.mjs'])
    .pipe(dest(publishDir));
}

export function copyBuildTypescriptDeclarationToPublishDir() {
  return src([buildDir + '/**/*.d.ts', buildDir + '/**/*.d.mts', buildDir + '/**/*.d.cts'])
    .pipe(dest(publishDir));
}


export function copySrcJsToPublishDir ()  {
  return src([srcDir + '/**/*.js', srcDir + '/**/*.mjs', srcDir + '/**/*.cjs', srcDir + '/**/*.d.ts', srcDir + '/**/*.d.mts', srcDir + '/**/*.d.cts'])
    .pipe(dest(publishDir));
};

export function copySrcMdToPublishDir () {
  return src([srcDir + '/**/*.md', './*.md'])
    .pipe(dest(publishDir));
}

export function copyPackageJsonToBuildDir(cb) {
  try {
    fs.mkdirSync(buildDir);
  } catch (error) {
    if(error.code !== 'EEXIST') {
      cb(error);
    }
  }
  fs.writeFileSync(buildDir + '/package.json', JSON.stringify(packageJson, null, 2));
  cb();
}


export function copyPackageJsonToPublishDir(cb) {
  try {
    fs.mkdirSync(publishDir);
  } catch (error) {
    if(error.code !== 'EEXIST') {
      cb(error);
    }
  }
  fs.writeFileSync(publishDir + '/package.json', JSON.stringify(packageJson, null, 2));
  cb();
}

/**
 * @deprecated
 * @param cb
 */
export function copyPackageJsonToLambdaLayerDir(cb) {
  try {
    fs.mkdirSync(buildDir);
  }
  catch (error) {
    if(error.code !== 'EEXIST') {
      cb(error);
    }
  }
  try {
    fs.mkdirSync(lambdaLayerDir);
  }
  catch (error) {
    if(error.code !== 'EEXIST') {
      cb(error);
    }
  }
  fs.writeFileSync(lambdaLayerDir + '/package.json', JSON.stringify(packageJson, null, 2));
  cb();
}

/**
 * @deprecated
 * @returns {*}
 */
export function packageLayerRelease() {
  return src(buildDir + '/**/*.*')
    .pipe(zip(unscopedName + '.zip'))
    .pipe(dest(releaseDir));
}

/**
 * @deprecated
 * @returns {*}
 */
export function packageLambdaRelease() {
  return src(buildDir + '/**/*.*')
    .pipe(zip(unscopedName + '.zip'))
    .pipe(dest(releaseDir));
}


export function incrementJsonPatch(cb) {
  let version = packageJson.version;
  const semver = version.split('.');
  if(semver.length = 3) {
    console.log('Old package version: ', packageJson.version);
    let patchVersion = parseInt(semver[2],10) + 1;
    packageJson.version = semver[0] + '.' + semver[1] + '.' + patchVersion;
    console.log('New package version: ' + packageJson.version);
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  }
  cb();
}





function coreUpdate(packageName, cwd = './') {
  return new Promise((resolve, reject) => {
    const out = execSync('npm install ' + packageName + '@latest',{cwd: cwd}, {encoding: 'utf8'}).toString();
    console.log(out);
    resolve(true);
  });
}

function executeCoreUpdates(dependencyList, cwd = './') {
  let promises = [];
  for (let dependency in dependencyList) {
    if (dependency.startsWith('@franzzemen')) {
      console.log('Executing core update on ' + dependency);
      promises.push(coreUpdate(dependency, cwd));
    }
  }
  return Promise.all(promises);
}



// Takes core @franzzemen libraries and forces them to update to latest
function npmForceCoreLibraryUpdates(cb) {
  try {
    return new Promise(async (resolve, reject) => {
      // Get @franzzemen dependencies
      await executeCoreUpdates(packageJson.dependencies);
      // Get @franzzemen dev dependencies
      await executeCoreUpdates(packageJson.devDependencies);
      resolve(true);
      cb();
    }).catch(err => {
      console.log(err);
      cb();
    });
    cb();
  } catch (err) {
    console.log(err);
    cb();
  }
}

export function incrementJsonMinor(cb) {
  let version = packageJson.version;
  const semver = version.split('.');
  if (semver.length = 3) {
    console.log('Old package version: ', packageJson.version);
    let minorVersion = parseInt(semver[1], 10) + 1;
    packageJson.version = semver[0] + '.' + minorVersion + '.0';
    console.log('New package version: ' + packageJson.version);
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  }
  cb();
}

export function incrementJsonMajor(cb) {
  let version = packageJson.version;
  const semver = version.split('.');
  if (semver.length = 3) {
    console.log('Old package version: ', packageJson.version);
    let majorVersion = parseInt(semver[0], 10) + 1;
    packageJson.version = majorVersion + '.0.0';
    console.log('New package version: ' + packageJson.version);
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  }
  cb();
}

export function npmInstallBuildDir(cb) {
  exec('npm install --only=prod --no-package-lock', {cwd: buildDir}, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

export function npmInstallLayerDir(cb) {
  exec('npm install --only=prod --no-package-lock', {cwd: lambdaLayerDir}, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

export function publish(cb) {
  console.log(`npm publish ./publish`);
  const result = execSync('npm publish ./publish', {});
  console.log(result.toString('utf-8'));
  console.log(`Setting npm post-publish delay of ${npmTimeout} millis`);
  setTimeout(() => {
    cb();
  }, npmTimeout)
  /*
  exec('npm publish ./publish', {}, (err, stdout, stderr) => {
    console.log(`Setting npm post-publish delay of ${npmTimeout} millis`);
    setTimeout(() => {
      console.log(stdout);
      console.log(stderr);
      cb(err);
      cb();
    }, npmTimeout)
  });
  
   */
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

function statusCode() {
  return new Promise((success, error) => {
    git.status({args: '--porcelain'}, (err, stdout) => {
      success(cleanGitStatus(stdout));
    });
  });
}


export async function gitCheckIn(cb) {
  const args = minimist(process.argv.slice(2));
  if (args.m && args.m.trim().length > 0) {
    let files = await statusCode();
    return src(files)
      .pipe(git.add())
      .pipe(git.commit(args.m));
  } else return Promise.reject('No source comment');
};

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
      }, gitTimeout)
    })
    .catch(err => {
      console.log(err, err.stack);
      cb();
    });
};

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
        }, gitTimeout)
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
};

export function gitPush(cb) {
  console.log('Pushing to ' + mainBranch);
  git.push('origin', mainBranch, function (err) {
    if (err) throw err;
    cb();
  });
};

export function samClean(cb) {
  let functions = fs.readdirSync('./functions');
  functions.forEach(lambdaFunction => {
    console.log('Deleted ' + deleteSync('./functions/' + lambdaFunction + '/release'));
  });
  functions.forEach(lambdaFunction => {
    console.log('Deleted ' + deleteSync('./functions/' + lambdaFunction + '/testing'));
  });
  let layers = fs.readdirSync('./layers');
  layers.forEach(layer => {
    console.log('Deleted ' + deleteSync('./layers/' + layer + '/nodejs/node_modules'));
  });
  cb();
}

function _samNpmInstallFunctionRelease(lambdaFunction) {
  return new Promise((resolve, reject) => {
    console.log('Executing \"npm install --only=prod --no-package-lock\" in ./functions/' + lambdaFunction + '/release');
    console.log(execSync('npm install --only=prod --no-package-lock', {cwd: './functions/' + lambdaFunction + '/release'}, {encoding: 'utf'}).toString());
    resolve(true);
  });
}

function _samNpmForceUpdateFunction(lambdaFunction) {
  let promises = [];
  const functionPackageJson = JSON.parse(fs.readFileSync('./functions/' + lambdaFunction + '/package.json', {encoding: 'utf8'}).toString());
  promises.push(executeCoreUpdates(functionPackageJson.dependencies, './functions/' + lambdaFunction));
  promises.push(executeCoreUpdates(functionPackageJson.devDependencies, './functions/' + lambdaFunction));
  return Promise.all(promises);
}

function _samNpmForceUpdateLayer(layer) {
  let promises = [];
  const layerPackageJson = JSON.parse(fs.readFileSync('./layers/' + layer + '/nodejs/package.json', {encoding: 'utf8'}).toString());
  promises.push(executeCoreUpdates(layerPackageJson.dependencies, './layers/' + layer + '/nodejs'));
  promises.push(executeCoreUpdates(layerPackageJson.devDependencies, './layers/' + layer + '/nodejs'));
  return Promise.all(promises);
}

async function _samNpmForceUpdateFunctionProject(functions) {
  let promises = [];
  functions.forEach( (lambdaFunction) => {
    promises.push(_samNpmForceUpdateFunction(lambdaFunction));
  });
  return Promise.all(promises);
}

async function _samNpmForceUpdateLayerProject(layers) {
  let promises = [];
  layers.forEach( (layer) => {
    promises.push(_samNpmForceUpdateLayer(layer));
  });
  return Promise.all(promises);
}


export async function samNpmForceUpdateFunctionsProject(cb) {
  let functions = fs.readdirSync('./functions');
  await _samNpmForceUpdateFunctionProject(functions);
  cb();
}

export async function samNpmForceUpdateLayersProject(cb) {
  let layers = fs.readdirSync('./layers');
  await _samNpmForceUpdateLayerProject(layers);
  cb();
}


function _samInstallFunctionsReleases(functions) {
  let npmPromises = [];
  functions.forEach( (lambdaFunction) => {
    npmPromises.push(_samNpmInstallFunctionRelease(lambdaFunction));
  });
  return Promise.all(npmPromises);
}

//function transpileTypescriptToBuildDir() {
//  const tsProject = ts.createProject('tsconfig.src.json');
//  return src(tsSrcDir + '/**/*.ts')
//    .pipe(sourcemaps.init())
//    .pipe(tsProject())
//    .pipe(sourcemaps.write())
//    .pipe(dest(buildDir));
//}

export function samTranspileFunctionsTypescriptToReleases(cb) {
  let functions = fs.readdirSync('./functions');
  let merged, last;
  functions.forEach((lambdaFunction) => {
    let tsProject = ts.createProject('tsconfig.src.json');
    let thisStream = src('./functions/' + lambdaFunction + '/ts-src/**/*.ts')
//      .pipe(sourcemaps.init())
      .pipe(tsProject())
//      .pipe(sourcemaps.write())
      .pipe(dest('./functions/' + lambdaFunction + '/release'));
    if(merged) {
      merged.add(thisStream);
    } else if (last) {
      merged = merge(last, thisStream);
    } else {
      last = thisStream;
    }
  });
  if(merged) {
    return merged;
  } else if (last) {
    return last;
  } else {
    cb();
  }
}

export function samTranspileFunctionsTestTypescriptToTesting(cb) {
  let functions = fs.readdirSync('./functions');
  let merged, last;
  functions.forEach((lambdaFunction) => {
    let tsProject = ts.createProject('tsconfig.src.json');
    let thisStream = src('./functions/' + lambdaFunction + '/ts-test/**/*.ts')
      //      .pipe(sourcemaps.init())
      .pipe(tsProject())
      //      .pipe(sourcemaps.write())
      .pipe(dest('./functions/' + lambdaFunction + '/testing'));
    if(merged) {
      merged.add(thisStream);
    } else if (last) {
      merged = merge(last, thisStream);
    } else {
      last = thisStream;
    }
  });
  if(merged) {
    return merged;
  } else if (last) {
    return last;
  } else {
    cb();
  }
}

export function samCreateFunctionsReleases(cb) {
  let functions = fs.readdirSync('./functions');
  let merged, last;
  functions.forEach((lambdaFunction) => {
    let thisStream = src(
      [
        './functions/' + lambdaFunction + '/src/**/*.js',
        './functions/' + lambdaFunction + '/src/**/*.json',
        './functions/' + lambdaFunction + '/src/**/*.pem',
        './functions/' + lambdaFunction + '/package.json',
        './functions/' + lambdaFunction + '/src/**/*.crt'])
      .pipe(debug())
      .pipe(dest('./functions/' + lambdaFunction + '/release'));
    if(merged) {
      merged.add(thisStream);
    } else if (last) {
      merged = merge(last, thisStream);
    } else {
      last = thisStream;
    }
  });
  if(merged) {
    return merged;
  } else if (last) {
    return last;
  } else {
    cb();
  }
}

export function samCopyTestFiles(cb) {
  let functions = fs.readdirSync('./functions');
  let merged, last;
  functions.forEach((lambdaFunction) => {
    if(fs.existsSync('./functions/' + lambdaFunction + '/ts-test')) {
      let thisStream = src(
        [
          './functions/' + lambdaFunction + '/ts-test/config.json',
          './functions/' + lambdaFunction + '/ts-test/**/*.pem',
        ])
        .pipe(debug())
        .pipe(dest('./functions/' + lambdaFunction + '/testing'));
      if (merged) {
        merged.add(thisStream);
      } else if (last) {
        merged = merge(last, thisStream);
      } else {
        last = thisStream;
      }
    }
  });
  if(merged) {
    return merged;
  } else if (last) {
    return last;
  } else {
    cb();
  }
}

export async function samInstallFunctionsReleases(cb) {
  let functions = fs.readdirSync('./functions');
  await _samInstallFunctionsReleases(functions);
  cb();
}

function _samNpmInstallLayer(layer) {
  return new Promise((resolve, reject) => {
    console.log('Executing \"npm install --only=prod --no-package-lock\" in ./layers/' +layer + '/nodejs');
    execSync('npm install --only=prod --no-package-lock',{cwd: './layers/' + layer + '/nodejs'});
    resolve(true);
  });
}

export function samRefreshLayers(cb) {
  let layers = fs.readdirSync('./layers');
  layers.forEach(async (layer) => {
    console.log('Executing \"npm install --only=prod --no-package-lock\" in ./layers/' +layer + '/nodejs');
    execSync('npm install --only=prod --no-package-lock',{cwd: './layers/' + layer + '/nodejs'});
  });
  cb();
}

export function samBuild(cb) {
  return new Promise((resolve, reject) => {
    console.log('Executing \"sam build');
    console.log(execSync('sam build',{cwd: './', encoding : 'utf8'}).toString());
    resolve(true);
  });
}

export function samDeploy(cb) {
  return new Promise((resolve, reject) => {
    console.log('Executing \"sam deploy');
    console.log(execSync('sam deploy',{cwd: './', encoding : 'utf8'}).toString());
    resolve(true);
  });
}



export const npmForceUpdateProject = npmForceCoreLibraryUpdates;

export const upgrade = gulp.series(
  ncuu,
  npmInstallProject
);

export function test ()  {
  return src(['./testing/**/*.test.js', './testing/**/*.test.mjs', './testing/**/*.test.cjs'])
    .pipe(mocha({timeout: mochaTimeout}));
}

export const buildTest = gulp.series(
  cleanTesting,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  tscTsTest,
  test
);

export default gulp.series(
  cleanUnwantedFiles,
  cleanPublish,
  cleanBuild,
  cleanTesting,
  tscTsSrc,
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  copyBuildJsonToPublishDir,
  tscTsTest,// Must be transpiled after publish dir as it refers to publish index.d.ts
  copyPackageJsonToPublishDir,
  test);

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
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  copyBuildJsonToPublishDir,
  tscTsTest, // Must be transpiled after publish dir as it refers to publish index.d.ts
  test,
  incrementJsonPatch,
  copyPackageJsonToPublishDir,
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
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  tscTsTest, // Must be transpiled after publish dir as it refers to publish index.d.ts
  test,
  incrementJsonMinor,
  copyPackageJsonToPublishDir,
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
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  copyBuildJsonToPublishDir,
  tscTsTest, // Must be transpiled after publish dir as it refers to publish index.d.ts
  test,
  incrementJsonMajor,
  copyPackageJsonToPublishDir,
  publish,
  gitAdd,
  gitCommit,
  gitPush);
