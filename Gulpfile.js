const gulpBase = require ('./Gulpbase').init(require('./package.json'));
const {src, dest, series} = require('gulp');

// For this one Npm package, src (Gulpbase.js) is not in src, so need local copy function.
function copyJS() {
return src('./Gulpbase.js')
  .pipe(dest(gulpBase.publishDir));
}

exports.default = series(
  gulpBase.cleanRelease,
  copyJS,
  gulpBase.copyPackageJsonToPublishDir);

exports.cleanPublish = gulpBase.cleanPublish;

exports.patch = series(
  gulpBase.cleanPublish,
  copyJS,
  gulpBase.incrementJsonPatch,
  gulpBase.copyPackageJsonToPublishDir,
  gulpBase.publish,
  gulpBase.cleanPublish);

