const src = require('gulp').src;
const dest = require('gulp').dest;
const exec = require('child_process').exec;
const del = require('del');
const fs = require('fs');
const zip = require('gulp-zip');
const path = require('path');
const updateLambda = require('@franzzemen/aws-scripts').updateLambda;
const minimist = require('minimist');
const git = require('gulp-git');
const series = require('gulp').series;



var packageJson = null;
let unscopedName = null;

function init(package) {
  packageJson = package;
   unscopedName = path.parse(packageJson.name).name;
  return exports;
}

const srcDir = './src';
const buildDir = './build';
const releaseDir = './release';
const publishDir = './publish';
const lambdaLayerDir = buildDir + '/nodejs';


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

function packageLayerRelease() {
  return src(buildDir + '/**/*.*')
    .pipe(zip(unscopedName + '.zip'))
    .pipe(dest(releaseDir));
}

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
  console.log({uncommittedFiles:uncommittedFiles});
  return uncommittedFiles;
}

function statusCode() {
  return new Promise((success, error) => {
    git.status({args: '--porcelain'}, (err, stdout) => {
      success(cleanGitStatus(stdout));
    });
  })
}

function addCode() {

}

function commitCode() {
  const arguments = minimist(process.argv.slice(2));
  if(arguments.m && arguments.m.trim().length > 0) {
    return src('./*')
      .pipe(git.commit(arguments.m))
  }
}

function gitCheckIn(cb) {
  const arguments = minimist(process.argv.slice(2));
  if(arguments.m && arguments.m.trim().length > 0) {
    return statusCode()
      .then(files => {
        return src(files)
          .pipe(git.add())
          .pipe(git.commit(arguments.m));
      });
  }
  else return Promise.reject('No source comment');
};

function gitPush(cb) {
  console.log('Pushing to master'); 
  git.push('origin', 'master', function (err) {
    if (err) throw err;
  });
  cb();
};


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

exports.npmInstallBuildDir = npmInstallBuildDir;
exports.npmInstallLayerDir = npmInstallLayerDir;

exports.packageLayerRelease = packageLayerRelease;
exports.packageLambdaRelease = packageLambdaRelease;

exports.incrementJsonPatch = incrementJsonPatch;
exports.incrementJsonMinor = incrementJsonMinor;
exports.incrementJsonMajor = incrementJsonMajor;

exports.deployLambda = deployLambda;

exports.publish = publish;

exports.gitCheckIn = gitCheckIn;
exports.gitPush = gitPush;

