const gulpBase = require ('./Gulpbase').init(require('./package.json'));
const {src, dest, series} = require('gulp');
// For this one Npm package, src (Gulpbase.js) is not in src, so need local copy function.
function copyJS() {
return src('./Gulpbase.js')
  .pipe(dest(gulpBase.publishDir));
}

exports.default = series(
  gulpBase.cleanRelease,
  gulpBase.transpileTypescriptToBuildDir,  // Test to see that typescript is transferred
  gulpBase.copySrcJsToBuildDir, // Test to see that js is copied
  copyJS,
  gulpBase.copyPackageJsonToPublishDir);

exports.cleanPublish = gulpBase.cleanPublish;

exports.patch = series(
  gulpBase.cleanPublish,
  copyJS,
  gulpBase.incrementJsonPatch,
  gulpBase.copyPackageJsonToPublishDir,
  gulpBase.publish,
  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);
  //gulpBase.gitCheckIn,
  //gulpBase.gitPush);

exports.minor = series(
  gulpBase.cleanPublish,
  copyJS,
  gulpBase.incrementJsonMinor,
  gulpBase.copyPackageJsonToPublishDir,
  gulpBase.publish,
  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);

exports.major = series(
  gulpBase.cleanPublish,
  copyJS,
  gulpBase.incrementJsonMajor,
  gulpBase.copyPackageJsonToPublishDir,
  gulpBase.publish,
  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);

exports.npmForceUpdateProject = gulpBase.npmForceUpdateProject;
exports.npmUpdateProject = gulpBase.npmUpdateProject;
