// Define directories used in functions here which means they will execute from <project>/node_modules/@franzzemen/gulp-base
const del = require('del');

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

function copyPackageJsonToPublishDir() {
  return src('./package.json')
    .pipe(dest(publishDir));
}

exports.srcDir = srcDir;
exports.buildDir = buildDir;
exports.releaseDir = releaseDir;

exports.cleanBuild = cleanBuild;
exports.cleanRelease = cleanRelease;
exports.cleanPublish = cleanPublish;

exports.copySrcJsToReleaseDir = copySrcJsToReleaseDir;
exports.copySrcJsToPublishDir = copySrcJsToPublishDir;
exports.copyPackageJsonToPublishDir = copyPackageJsonToPublishDir;
