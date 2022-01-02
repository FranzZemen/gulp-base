const src = require('gulp').src;
const dest = require('gulp').dest;
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const del = require('del');
const fs = require('fs');
const zip = require('gulp-zip');
const path = require('path');
// const updateLambda = require('@franzzemen/aws-scripts').updateLambda;
const minimist = require('minimist');
const git = require('gulp-git');
const series = require('gulp').series;
const debug = require('gulp-debug');
const merge = require('merge-stream');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const mocha = require('gulp-mocha');
const {buildTest} = require('./Gulpbase');
const {main} = require('mocha/lib/cli/index');

exports.npmInstallProject = require('./npm-commands').npmInstallProject;
exports.npmUpdateProject = require('./npm-commands').npmUpdateProject;
exports.ncu = require('./ncu').ncu;
exports.ncuu = require('./ncu').ncuu;

let packageJson = null;
let gitTimeout = null;
let unscopedName = null;
let useSourcemaps = true;
let mainBranch = 'master'; // most repos still using master, later move this to main

const tsSrcDir = './ts-src';
const tsTestDir = './ts-test';

// Forced deprecation use "declaration": true in tsconfig.json instead and task copyBuildIndexTypescriptDeclarationToPublishDir
// const tsDeclarationDir = './ts-d';
const srcDir = './src';
const testDir = './test';
const testingDir = './testing';
const buildDir = './build';
const releaseDir = './release';
const publishDir = './publish';
const lambdaLayerDir = buildDir + '/nodejs';

function init(packageName, timeout=100, _useSourcemaps = true) {
  gitTimeout = timeout;
  packageJson = packageName;
  unscopedName = path.parse(packageJson.name).name;
  useSourcemaps = _useSourcemaps;
  return exports;
}

function cleanTesting() {
  return del(testingDir);
}

function cleanBuild() {
  return del(buildDir);
}

function cleanRelease() {
  return del(releaseDir);
}

function cleanPublish() {
  return del(publishDir);
}

function transpileTypescriptToBuildDir() {
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

function transpileTestTypescriptToTestingDir() {
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

function copyTestJsToTestingDir() {
  return src(testDir + '/**/*.js')
    .pipe(dest(testingDir));
}

function copyJsonToTestingDir() {
  return src([testDir + '/**/*.json', tsTestDir + '/**/*.json'])
    .pipe(dest(testingDir));
}

function copySecretsToTestingDir() {
  return src([testDir + '/**/*.pem', tsTestDir + '/**/*.pem'])
    .pipe(dest(testingDir));
}

function copyJsonToBuildDir() {
  return src([srcDir + '/**/*.json', tsSrcDir + '/**/*.json'])
    .pipe(dest(buildDir));
}

function copyBuildJsonToPublishDir() {
  return src([buildDir + '/**/*.json'])
    .pipe(dest(publishDir));
}

function copySrcJsToBuildDir() {
  return src(srcDir + '/**/*.js')
    .pipe(dest(buildDir));
}

function copySrcJsToReleaseDir ()  {
  return src(srcDir + '/**/*.js')
    .pipe(dest(releaseDir));
};

function copyBuildJsToPublishDir() {
  return src(buildDir + '/**/*.js')
    .pipe(dest(publishDir));
}

function copyBuildTypescriptDeclarationToPublishDir() {
  return src(buildDir + '/**/*.d.ts')
    .pipe(dest(publishDir));
}


function copySrcJsToPublishDir ()  {
  return src(srcDir + '/**/*.js')
    .pipe(dest(publishDir));
};

function copySrcMdToPublishDir () {
  return src(srcDir + '/**/*.md')
    .pipe(dest(publishDir));
}

function copyPackageJsonToBuildDir(cb) {
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


function copyPackageJsonToPublishDir(cb) {
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
function copyPackageJsonToLambdaLayerDir(cb) {
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
function packageLayerRelease() {
  return src(buildDir + '/**/*.*')
    .pipe(zip(unscopedName + '.zip'))
    .pipe(dest(releaseDir));
}

/**
 * @deprecated
 * @returns {*}
 */
function packageLambdaRelease() {
  return src(buildDir + '/**/*.*')
    .pipe(zip(unscopedName + '.zip'))
    .pipe(dest(releaseDir));
}


function incrementJsonPatch(cb) {
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

function incrementJsonMinor(cb) {
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

function incrementJsonMajor(cb) {
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

function npmInstallBuildDir(cb) {
  exec('npm install --only=prod --no-package-lock', {cwd: buildDir}, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

function npmInstallLayerDir(cb) {
  exec('npm install --only=prod --no-package-lock', {cwd: lambdaLayerDir}, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

function publish(cb) {
  exec('npm publish publish', {}, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

/**
 * @deprecated
 * @returns {*}
 */
/*
function deployLambda() {
  const zipPath = path.resolve(releaseDir + '/' + unscopedName + '.zip');
  console.log('Zip path: ' + zipPath);
  return updateLambda(unscopedName, zipPath);
}*/

function cleanGitStatus(data) {
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


async function gitCheckIn(cb) {
  const args = minimist(process.argv.slice(2));
  if (args.m && args.m.trim().length > 0) {
    let files = await statusCode();
    return src(files)
      .pipe(git.add())
      .pipe(git.commit(args.m));
  } else return Promise.reject('No source comment');
};

function gitAdd(cb) {
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

function gitCommit(cb) {
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

function gitPush(cb) {
  console.log('Pushing to ' + mainBranch);
  git.push('origin', mainBranch, function (err) {
    if (err) throw err;
    cb();
  });
};

function samClean(cb) {
  let functions = fs.readdirSync('./functions');
  functions.forEach(lambdaFunction => {
    console.log('Deleted ' + del.sync('./functions/' + lambdaFunction + '/release'));
  });
  functions.forEach(lambdaFunction => {
    console.log('Deleted ' + del.sync('./functions/' + lambdaFunction + '/testing'));
  });
  let layers = fs.readdirSync('./layers');
  layers.forEach(layer => {
    console.log('Deleted ' + del.sync('./layers/' + layer + '/nodejs/node_modules'));
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


async function samNpmForceUpdateFunctionsProject(cb) {
  let functions = fs.readdirSync('./functions');
  await _samNpmForceUpdateFunctionProject(functions);
  cb();
}

async function samNpmForceUpdateLayersProject(cb) {
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

function samTranspileFunctionsTypescriptToReleases(cb) {
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

function samTranspileFunctionsTestTypescriptToTesting(cb) {
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

function samCreateFunctionsReleases(cb) {
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

function samCopyTestFiles(cb) {
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

async function samInstallFunctionsReleases(cb) {
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

function samRefreshLayers(cb) {
  let layers = fs.readdirSync('./layers');
  layers.forEach(async (layer) => {
    console.log('Executing \"npm install --only=prod --no-package-lock\" in ./layers/' +layer + '/nodejs');
    execSync('npm install --only=prod --no-package-lock',{cwd: './layers/' + layer + '/nodejs'});
  });
  cb();
}

function samBuild(cb) {
  return new Promise((resolve, reject) => {
    console.log('Executing \"sam build');
    console.log(execSync('sam build',{cwd: './', encoding : 'utf8'}).toString());
    resolve(true);
  });
}

function samDeploy(cb) {
  return new Promise((resolve, reject) => {
    console.log('Executing \"sam deploy');
    console.log(execSync('sam deploy',{cwd: './', encoding : 'utf8'}).toString());
    resolve(true);
  });
}


exports.tsScrDir = tsSrcDir;
exports.tsTestDir = tsTestDir;
exports.srcDir = srcDir;
exports.testDir = testDir; // JS test files (in JS projects, where you'd run JS files);
exports.testingDir = testingDir; // Outpuit for JS test AND compiled TS test files (where' you'd run them all)
exports.buildDir = buildDir;
exports.releaseDir = releaseDir;
exports.publishDir = publishDir;
exports.mainBranch = mainBranch;

exports.setMainBranch = function(branch) {
  mainBranch = branch;
}

exports.init = init;

exports.cleanTesting = cleanTesting;
exports.cleanBuild = cleanBuild;
exports.cleanRelease = cleanRelease;
exports.cleanPublish = cleanPublish;

exports.transpileTypescriptToBuildDir = transpileTypescriptToBuildDir;
exports.transpileTestTypescriptToTestingDir = transpileTestTypescriptToTestingDir;

exports.copySrcMdToPublishDir = copySrcMdToPublishDir;
exports.copySrcJsToBuildDir = copySrcJsToBuildDir;
exports.copyTestJsToTestingDir = copyTestJsToTestingDir;
exports.copyJsonToTestingDir = copyJsonToTestingDir;
exports.copySecretsToTestingDir = copySecretsToTestingDir;
exports.copyJsonToBuildDir = copyJsonToBuildDir;
exports.copySrcJsToReleaseDir = copySrcJsToReleaseDir;
exports.copySrcJsToPublishDir = copySrcJsToPublishDir;
exports.copyBuildJsToPublishDir = copyBuildJsToPublishDir;
exports.copyBuildTypescriptDeclarationToPublishDir = copyBuildTypescriptDeclarationToPublishDir;

exports.copyPackageJsonToBuildDir = copyPackageJsonToBuildDir;
exports.copyPackageJsonToPublishDir = copyPackageJsonToPublishDir;
exports.copyPackageJsonToLambdaLayerDir = copyPackageJsonToLambdaLayerDir;

exports.npmForceUpdateProject = npmForceCoreLibraryUpdates;

exports.npmInstallBuildDir = npmInstallBuildDir;
exports.npmInstallLayerDir = npmInstallLayerDir;

exports.packageLayerRelease = packageLayerRelease;
exports.packageLambdaRelease = packageLambdaRelease;

exports.incrementJsonPatch = incrementJsonPatch;
exports.incrementJsonMinor = incrementJsonMinor;
exports.incrementJsonMajor = incrementJsonMajor;

// exports.deployLambda = deployLambda;

exports.publish = publish;

exports.gitAdd = gitAdd;
exports.gitCommit = gitCommit;
exports.gitCheckIn = gitCheckIn;
exports.gitPush = gitPush;

exports.samClean = samClean;
exports.samNpmForceUpdateFunctionsProject = samNpmForceUpdateFunctionsProject;
exports.samNpmForceUpdateLayersProject = samNpmForceUpdateLayersProject;
exports.samCreateFunctionsReleases = samCreateFunctionsReleases;
exports.samTranspileFunctionsTypescriptToReleases = samTranspileFunctionsTypescriptToReleases;
exports.samTranspileFunctionsTestTypescriptToTesting = samTranspileFunctionsTestTypescriptToTesting;
exports.samInstallFunctionsReleases = samInstallFunctionsReleases;
exports.samCopyTestFiles = samCopyTestFiles;
exports.samRefreshLayers = samRefreshLayers;
exports.samBuild = samBuild;
exports.samDeploy = samDeploy;

exports.upgrade = series(
  exports.ncuu,
  exports.npmInstallProject
);

function test ()  {
  return src('./testing/**/*.test.js')
    .pipe(mocha());
}

exports.test = test;

exports.buildTest = series(
  cleanTesting,
  copyTestJsToTestingDir,
  copyJsonToTestingDir,
  transpileTestTypescriptToTestingDir,
  test
);

exports.default = series(
  cleanPublish,
  cleanBuild,
  cleanTesting,
  transpileTypescriptToBuildDir,
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



exports.patch = series(
  cleanPublish,
  cleanBuild,
  cleanTesting,
  transpileTypescriptToBuildDir,
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


exports.minor = series(
  cleanPublish,
  cleanBuild,
  cleanTesting,
  transpileTypescriptToBuildDir,
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

exports.major = series(
  cleanPublish,
  cleanBuild,
  cleanTesting,
  transpileTypescriptToBuildDir,
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
