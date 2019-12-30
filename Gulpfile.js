const gulpBase = require ('./Gulpbase');
const {src, dest, series} = require('gulp');

// For this one Npm package, src (Gulpbase.js) is not in src, so need local copy function.   If we place it in a src
// directory this module will fail because it loads package.json relative to project root when from node_modules, but
// here it would be calling it from subfolder and have the wrong path
function copyJS() {
return src('./Gulpbase.js')
  .pipe(dest(gulpBase.publishDir));
}

exports.patch = series(gulpBase.cleanRelease, copyJS, gulpBase.incrementJsonPatch, gulpBase.copyPackageJsonToPublishDir, gulpBase.publish);

