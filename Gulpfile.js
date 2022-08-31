import { createRequire } from "module";
const require = createRequire(import.meta.url);
import * as gulpBase from './Gulpbase.js';
gulpBase.init(require('./package.json'));
// const gulpBase = require ('./Gulpbase').init(require('./package.json'));
import gulp from 'gulp';
const src = gulp.src;
const dest = gulp.dest;
const series = gulp.series;
// const {src, dest, series} = require('gulp');
// For this one Npm package, src (Gulpbase.js) is not in src, so need local copy function.
function copyGulpBaseToPublishDir() {
return src([
  './Gulpbase.js',
  './npm-commands.js',
  './ncu.js'])
  .pipe(dest(gulpBase.publishDir));
}

export default  series(
  gulpBase.cleanRelease,
  gulpBase.transpileTypescriptToBuildDir,  // Test to see that typescript is transferred
  gulpBase.copySrcJsToBuildDir, // Test to see that js is copied
  gulpBase.transpileTestTypescriptToTestingDir,
  gulpBase.copyTestJsToTestingDir,
  gulpBase.copyBuildTypescriptDeclarationToPublishDir,
  copyGulpBaseToPublishDir,
  gulpBase.copyPackageJsonToPublishDir);

export const cleanPublish = gulpBase.cleanPublish;

export const patch = series(
  gulpBase.cleanPublish,
  copyGulpBaseToPublishDir,
  gulpBase.incrementJsonPatch,
  gulpBase.copyPackageJsonToPublishDir,
  gulpBase.publish,
  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);
  //gulpBase.gitCheckIn,
  //gulpBase.gitPush);

export const minor = series(
  gulpBase.cleanPublish,
  copyGulpBaseToPublishDir,
  gulpBase.incrementJsonMinor,
  gulpBase.copyPackageJsonToPublishDir,
  gulpBase.publish,
  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);

export const major = series(
  gulpBase.cleanPublish,
  copyGulpBaseToPublishDir,
  gulpBase.incrementJsonMajor,
  gulpBase.copyPackageJsonToPublishDir,
  gulpBase.publish,
  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);

export const npmForceUpdateProject = gulpBase.npmForceUpdateProject;
export const npmUpdateProject = gulpBase.npmUpdateProject;
