const src = require('gulp').src;
const dest = require('gulp').dest;
const exec = require('child_process').exec;
const del = require('del');
const fs = require('fs');

var packageJson = null;

function init(package) {
  packageJson = package;
  return exports;
}

const srcDir = './src';
const buildDir = './build';
const releaseDir = './release';
const publishDir = './publish';

function cleanBuild() {
  return del(buildDir);
}

function cleanRelease() {
  return del(releaseDir);
}

function cleanPublish() {
  return del(publishDir);
}

function copySrcJsToReleaseDir ()  {
  return src(srcDir + '/**/*.js')
    .pipe(dest(releaseDir));
};

function copySrcJsToPublishDir ()  {
  return src(srcDir + '/**/*.js')
    .pipe(dest(publishDir));
};

function copyPackageJsonToPublishDir(cb) {
  fs.writeFileSync(publishDir + '/package.json', JSON.stringify(packageJson));
  cb();
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

function publish(cb) {
  exec('npm publish publish',{}, (err, stdout, stderr) =>{
    console.log(stdout);
    console.log(stderr);
    cb(err);
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

exports.copySrcJsToReleaseDir = copySrcJsToReleaseDir;
exports.copySrcJsToPublishDir = copySrcJsToPublishDir;
exports.copyPackageJsonToPublishDir = copyPackageJsonToPublishDir;

exports.incrementJsonPatch = incrementJsonPatch;
exports.publish = publish;
