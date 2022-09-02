import gulp from 'gulp';
const src = gulp.src;
const dest = gulp.dest;
import {exec} from 'child_process';
import {execSync} from 'child_process';
import {deleteSync} from 'del';
import * as fs from 'fs';
import * as zip from 'gulp-zip';
import * as path from 'path';
import minimist from 'minimist';
import git from 'gulp-git';
import debug from 'gulp-debug';
import merge from 'merge-stream';
import ts from 'gulp-typescript';
import sourcemaps from 'gulp-sourcemaps';
import mocha from 'gulp-mocha';
import {npmInstallProject} from './npm-commands.js';
export {npmUpdateProject} from './npm-commands.js';
import {ncu} from './ncu.js';
import {ncuu} from './ncu.js';

let packageJson = null;
let gitTimeout = null;
let unscopedName = null;
let useSourcemaps = true;
export let mainBranch = 'master'; // most repos still using master, later move this to main

export let tsSrcDir = './ts-src';
export let tsTestDir = './ts-test';

// Forced deprecation use "declaration": true in tsconfig.json instead and task copyBuildIndexTypescriptDeclarationToPublishDir
// const tsDeclarationDir = './ts-d';
export let srcDir = './src';
export let testDir = './test';
export let testingDir = './testing';
export let buildDir = './build';
export let releaseDir = './release';
export let publishDir = './publish';
const lambdaLayerDir = buildDir + '/nodejs';


export const setMainBranch = function(branch) {
  mainBranch = branch;
}

export const setSrcDir = function(dir) {
  srcDir = dir;
}

export const setTsSrcDir = function (dir) {
  tsSrcDir = dir;
}

export const setTsTestDir = function (dir) {
  tsTestDir = dir;
}

export const setTestDir = function (dir) {
  testDir = dir;
}

export const setTestingDir = function (dir) {
  testingDir = dir;
}

export const setBuildDir = function (dir) {
  buildDir = dir;
}

export const setReleaseDir = function (dir) {
  releaseDir = dir;
}


export const setPublishDir = function (dir) {
  publishDir = dir;
}


export function init(packageName, timeout=100, _useSourcemaps = true) {
  gitTimeout = timeout;
  packageJson = packageName;
  unscopedName = path.parse(packageJson.name).name;
  useSourcemaps = _useSourcemaps;
}

export function cleanTesting(cb) {
  deleteSync(testingDir);
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

export function transpileTypescriptToBuildDir() {
  const tsProject = ts.createProject('tsconfig.json');
  if(useSourcemaps) {
    return src(tsSrcDir + '/**/*.ts')
      .pipe(sourcemaps.init())
      .pipe(tsProject())
      .pipe(sourcemaps.write())
      .pipe(dest(buildDir));
  } else {
    return src(tsSrcDir + '/**/*.ts')
      .pipe(tsProject())
      .pipe(dest(buildDir));
  }
}

export function transpileTestTypescriptToTestingDir() {
  const tsProject = ts.createProject('tsconfig.json');
  if(useSourcemaps) {
    return src(tsTestDir + '/**/*.ts')
      .pipe(sourcemaps.init())
      .pipe(tsProject())
      .pipe(sourcemaps.write())
      .pipe(dest(testingDir));
  } else {
    return src(tsTestDir + '/**/*.ts')
      .pipe(tsProject())
      .pipe(dest(testingDir));
  }
}

export function copyTestJsToTestingDir() {
  return src(testDir + '/**/*.js')
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
  return src([srcDir + '/**/*.js', srcDir + '/**/*.d.ts'])
    .pipe(dest(buildDir));
}

export function copySrcJsToReleaseDir ()  {
  return src(srcDir + '/**/*.js')
    .pipe(dest(releaseDir));
};

export function copyBuildJsToPublishDir() {
  return src(buildDir + '/**/*.js')
    .pipe(dest(publishDir));
}

export function copyBuildTypescriptDeclarationToPublishDir() {
  return src(buildDir + '/**/*.d.ts')
    .pipe(dest(publishDir));
}


export function copySrcJsToPublishDir ()  {
  return src(srcDir + '/**/*.js')
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
  exec('npm publish ./publish', {}, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
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
//  const tsProject = ts.createProject('tsconfig.json');
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
    let tsProject = ts.createProject('tsconfig.json');
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
    let tsProject = ts.createProject('tsconfig.json');
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
  return src('./testing/**/*.test.js')
    .pipe(mocha());
}

export const buildTest = gulp.series(
  cleanTesting,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  transpileTestTypescriptToTestingDir,
  test
);

export default gulp.series(
  cleanPublish,
  cleanBuild,
  cleanTesting,
  transpileTypescriptToBuildDir,
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  copyBuildJsonToPublishDir,
  transpileTestTypescriptToTestingDir, // Must be transpiled after publish dir as it refers to publish index.d.ts
  copyPackageJsonToPublishDir,
  test);



export const patch = gulp.series(
  cleanPublish,
  cleanBuild,
  cleanTesting,
  transpileTypescriptToBuildDir,
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  copyBuildJsonToPublishDir,
  transpileTestTypescriptToTestingDir, // Must be transpiled after publish dir as it refers to publish index.d.ts
  test,
  incrementJsonPatch,
  copyPackageJsonToPublishDir,
  publish,
  gitAdd,
  gitCommit,
  gitPush);


export const minor = gulp.series(
  cleanPublish,
  cleanBuild,
  cleanTesting,
  transpileTypescriptToBuildDir,
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  transpileTestTypescriptToTestingDir, // Must be transpiled after publish dir as it refers to publish index.d.ts
  test,
  incrementJsonMinor,
  copyPackageJsonToPublishDir,
  publish,
  gitAdd,
  gitCommit,
  gitPush);

export const major = gulp.series(
  cleanPublish,
  cleanBuild,
  cleanTesting,
  transpileTypescriptToBuildDir,
  copySrcMdToPublishDir,
  copySrcJsToBuildDir,
  copyJsonToBuildDir,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  copyBuildTypescriptDeclarationToPublishDir,
  copyBuildJsToPublishDir,
  copyBuildJsonToPublishDir,
  transpileTestTypescriptToTestingDir, // Must be transpiled after publish dir as it refers to publish index.d.ts
  test,
  incrementJsonMajor,
  copyPackageJsonToPublishDir,
  publish,
  gitAdd,
  gitCommit,
  gitPush);
