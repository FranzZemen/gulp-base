const src = require('gulp').src;
const dest = require('gulp').dest;
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const del = require('del');
const fs = require('fs');
const zip = require('gulp-zip');
const path = require('path');
const updateLambda = require('@franzzemen/aws-scripts').updateLambda;
const minimist = require('minimist');
const git = require('gulp-git');
const series = require('gulp').series;




let packageJson = null;
let gitTimeout = null;
let unscopedName = null;

const srcDir = './src';
const buildDir = './build';
const releaseDir = './release';
const publishDir = './publish';
const lambdaLayerDir = buildDir + '/nodejs';

function init(package, timeout=100) {
  gitTimeout = timeout;
  packageJson = package;
  unscopedName = path.parse(packageJson.name).name;
  return exports;
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

function copySrcJsToBuildDir() {
  return src(srcDir + '/**/*.js')
    .pipe(dest(buildDir));
}

function copySrcJsToReleaseDir ()  {
  return src(srcDir + '/**/*.js')
    .pipe(dest(releaseDir));
};

function copySrcJsToPublishDir ()  {
  return src(srcDir + '/**/*.js')
    .pipe(dest(publishDir));
};

/**
 * @deprecated
 * @returns {*}
 */
function copySrcJsToLambdaLayerDir () {
  return src(srcDir + '/**/*.js')
    .pipe(dest(lambdaLayerDir));
}

function copyConfigToBuildDir() {
  return src(srcDir + '/config.json')
    .pipe(dest(buildDir));
}

function copyPackageJsonToBuildDir(cb) {
  try {
    fs.mkdirSync(buildDir);
  } catch (error) {
    if(error.code !== 'EEXIST') {
      cb(error);
    }
  }
  fs.writeFileSync(buildDir + '/package.json', JSON.stringify(packageJson));
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
  fs.writeFileSync(publishDir + '/package.json', JSON.stringify(packageJson));
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
  fs.writeFileSync(lambdaLayerDir + '/package.json', JSON.stringify(packageJson));
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
    fs.writeFileSync('./package.json', JSON.stringify(packageJson));
  }
  cb();
}

// Note this satisfies semver rules (will not update if semver rule does not allow)
function npmUpdateProject(cb) {
  exec('npm update',{cwd: './'}, (err, stdout, stderr) =>{
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

function coreUpdate(package, cwd = './') {
  return new Promise((resolve, reject) => {
    exec('npm install ' + package + '@latest',{cwd: cwd}, (err, stdout, stderr) =>{
      if (err) {
        console.log(err, erro.stack);
        reject(err);
      } else {
        console.log(stdout);
        console.log(stderr);
        resolve(true);
      }
    });
  });
}

function executeCoreUpdates(dependencyList, cwd = './') {
  return new Promise(async (resolve, reject) => {
    for (let dependency in dependencyList) {
      if (dependency.startsWith('@franzzemen')) {
        try {
          console.log('Executing core update on ' + dependency);
          let result = await coreUpdate(dependency, cwd);
        } catch (err) {
          console.log(err, err.stack);
          reject(err);
        }
      }
    }
    resolve(true);
  });
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
  };
}

function incrementJsonMinor(cb) {
  let version = packageJson.version;
  const semver = version.split('.');
  if(semver.length = 3) {
    console.log('Old package version: ', packageJson.version);
    let minorVersion = parseInt(semver[1],10) + 1;
    packageJson.version = semver[0] + '.' + minorVersion + '.0';
    console.log('New package version: ' + packageJson.version);
    fs.writeFileSync('./package.json', JSON.stringify(packageJson));
  }
  cb();
}

function incrementJsonMajor(cb) {
  let version = packageJson.version;
  const semver = version.split('.');
  if(semver.length = 3) {
    console.log('Old package version: ', packageJson.version);
    let majorVersion = parseInt(semver[0],10) + 1;
    packageJson.version = majorVersion + '.0.0';
    console.log('New package version: ' + packageJson.version);
    fs.writeFileSync('./package.json', JSON.stringify(packageJson));
  }
  cb();
}

function npmInstallBuildDir(cb) {
  exec('npm install --only=prod --no-package-lock',{cwd: buildDir}, (err, stdout, stderr) =>{
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

function npmInstallLayerDir(cb) {
  exec('npm install --only=prod --no-package-lock',{cwd: lambdaLayerDir}, (err, stdout, stderr) =>{
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

function publish(cb) {
  exec('npm publish publish',{}, (err, stdout, stderr) =>{
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

/**
 * @deprecated
 * @returns {*}
 */
function deployLambda() {
  const zipPath =  path.resolve(releaseDir + '/' + unscopedName + '.zip');
  console.log('Zip path: ' + zipPath);
  return updateLambda(unscopedName, zipPath);
}

function cleanGitStatus(data) {
  const fileDescriptions = data.split('\n');
  let uncommittedFiles = [];
  fileDescriptions.forEach(line => {
    if(line.length > 0) {
      const fileDescription = line.split(' ');
      uncommittedFiles.push(fileDescription[fileDescription.length-1]);
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

/*
function commitCode() {
  const arguments = minimist(process.argv.slice(2));
  if(arguments.m && arguments.m.trim().length > 0) {
    return src('./*')
      .pipe(git.commit(arguments.m))
  }
}*/

async function gitCheckIn(cb) {
  const arguments = minimist(process.argv.slice(2));
  if(arguments.m && arguments.m.trim().length > 0) {
    let files = await statusCode();
    return src(files)
      .pipe(git.add())
      .pipe(git.commit(arguments.m));
  }
  else return Promise.reject('No source comment');
};

 function gitAdd(cb) {
     statusCode()
       .then(files => {
        return src(files)
          .pipe(git.add());
       })
       .then(result => {
        setTimeout(()=>{
          console.log('Awaiting ' + gitTimeout + 'ms.  Next line should be \"Finished \'gitAdd\'\" If Add activity continues beyond this limit adjust through gitbase.init');
          cb();
        },gitTimeout)
       })
       .catch(err => {
         console.log(err, err.stack);
         cb();
       });
};

function gitCommit(cb) {
  const arguments = minimist(process.argv.slice(2));
  if(arguments.m && arguments.m.trim().length > 0) {
    statusCode()
      .then(files => {
        return src(files)
          .pipe(git.commit(arguments.m));
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
  console.log('Pushing to master');
  git.push('origin', 'master', function (err) {
    if (err) throw err;
    cb();
  });
};

function samClean(cb) {
  let functions = fs.readdirSync('./functions');
  functions.forEach(async lambdaFunction => {
    await (async => {
      del('./functions/' + lambdaFunction + '/release');
    });
  });
  let layers = fs.readdirSync('./layers');
  layers.forEach(async layer => {
    await (async => {
      del('./layers/' + layer + '/nodejs/node_modules');
    });
  });
  cb();
}


function _samCopyFunctionSrcToRelease(lambdaFunction) {
  return new Promise((resolve, reject)=> {
    console.log('Copying ./functions/' + lambdaFunction + 'to  ./functions/' + lambdaFunction + '/release');
    let result = src(
      [
        './functions/' + lambdaFunction + '/src/**/*.js',
        './functions/' + lambdaFunction + '/src/**/*.json',
        './functions/' + lambdaFunction + '/package.json'])
      .pipe(dest('./functions/' + lambdaFunction + '/release'));
    resolve(true);
  })
}

function _samNpmInstallFunctionRelease(lambdaFunction) {
  return new Promise((resolve, reject) => {
    console.log('Executing \"npm install --only=prod --no-package-lock\" in ./functions/' + lambdaFunction + '/release');
    execSync('npm install --only=prod --no-package-lock',{cwd: './functions/' + lambdaFunction + '/release'});
    resolve(true);
  });
}

async function _samNpmForceUpdateFunction(lambdaFunction) {
  const functionPackageJson = JSON.parse(fs.readFileSync('./functions/' + lambdaFunction + '/package.json',{encoding: 'utf8'}).toString());
  console.log(functionPackageJson);
  await executeCoreUpdates(functionPackageJson.dependencies, './functions/' + lambdaFunction);
}

async function _samNpmForceUpdateFunctionProject(functions) {
  return new Promise((resolve, reject)=> {
    functions.forEach(async (lambdaFunction) => {
      await _samNpmForceUpdateFunction(lambdaFunction);
    });
    resolve(true);
  });
}

async function samNpmForceUpdateFunctionsProject(cb) {
  let functions = fs.readdirSync('./functions');
  await _samNpmForceUpdateFunctionProject(functions);
  cb();
}

async function _samCreateFunctionReleases(functions) {
  return new Promise((resolve, reject)=> {
    functions.forEach(async (lambdaFunction) => {
      await _samCopyFunctionSrcToRelease(lambdaFunction);
      await _samNpmInstallFunctionRelease(lambdaFunction);
    });
    resolve(true);
  });
}

async function samCreateFunctionReleases(cb) {
  let functions = fs.readdirSync('./functions');
  await _samCreateFunctionReleases(functions);
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
    await _samNpmInstallLayer(layer);
  });
  cb();
}

function samBuild(cb) {
  return new Promise((resolve, reject) => {
    console.log('Executing \"sam build');
    execSync('sam build',{cwd: './'});
    resolve(true);
  });
}

function samDeploy(cb) {
  return new Promise((resolve, reject) => {
    console.log('Executing \"sam deploy');
    execSync('sam build',{cwd: './'});
    resolve(true);
  });
}



exports.srcDir = srcDir;
exports.buildDir = buildDir;
exports.releaseDir = releaseDir;
exports.publishDir = publishDir;

exports.init = init;

exports.cleanBuild = cleanBuild;
exports.cleanRelease = cleanRelease;
exports.cleanPublish = cleanPublish;

exports.copySrcJsToBuildDir = copySrcJsToBuildDir;
exports.copySrcJsToReleaseDir = copySrcJsToReleaseDir;
exports.copySrcJsToPublishDir = copySrcJsToPublishDir;
exports.copySrcJsToLambdaLayerDir = copySrcJsToLambdaLayerDir;

exports.copyConfigToBuildDir = copyConfigToBuildDir;

exports.copyPackageJsonToBuildDir = copyPackageJsonToBuildDir;
exports.copyPackageJsonToPublishDir = copyPackageJsonToPublishDir;
exports.copyPackageJsonToLambdaLayerDir = copyPackageJsonToLambdaLayerDir;

exports.npmUpdateProject = npmUpdateProject;
exports.npmForceCoreLibraryUpdates = npmForceCoreLibraryUpdates; // Deprecated
exports.npmForceUpdateProject = npmForceCoreLibraryUpdates;

exports.npmInstallBuildDir = npmInstallBuildDir;
exports.npmInstallLayerDir = npmInstallLayerDir;

exports.packageLayerRelease = packageLayerRelease;
exports.packageLambdaRelease = packageLambdaRelease;

exports.incrementJsonPatch = incrementJsonPatch;
exports.incrementJsonMinor = incrementJsonMinor;
exports.incrementJsonMajor = incrementJsonMajor;

exports.deployLambda = deployLambda;

exports.publish = publish;

exports.gitAdd = gitAdd;
exports.gitCommit = gitCommit;
exports.gitCheckIn = gitCheckIn;
exports.gitPush = gitPush;

exports.samClean = samClean;
exports.samNpmForceUpdateFunctionsProject = samNpmForceUpdateFunctionsProject;
exports.samCreateFunctionReleases = samCreateFunctionReleases;
exports.samRefreshLayers = samRefreshLayers;
exports.samBuild = samBuild;
exports.samDeploy = samDeploy;

