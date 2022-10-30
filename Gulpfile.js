import {deleteSync} from 'del';
import { createRequire } from "module";
import {cwd} from 'process';
import {buildDir, cleanTranspiledCode, publishDir, releaseDir} from './Gulpbase.js';

import * as gulpBase from './Gulpbase.js';
import gulp from 'gulp';
const src = gulp.src;
const dest = gulp.dest;
const series = gulp.series;

const requireModule = createRequire(import.meta.url);
gulpBase.init(requireModule('./package.json'), cwd() + '/tsconfig.src.json', cwd() + '/tsconfig.test.json', 100);
gulpBase.setCleanTranspiled(true);



// For this one Npm package, src (Gulpbase.js) is not in src, so need local copy function.
function copyGulpBaseToPublishDir() {
return src([
  './Gulpbase.js',
  './npm-commands.js',
  './ncu.js'])
  .pipe(dest(gulpBase.publishDir));
}

function cleanPublishExtras(cb) {
  deleteSync(`${publishDir}/someTsDir`);
  deleteSync(`${publishDir}/clean-export*.*`)
  cb();
}

export default series(
  gulpBase.cleanRelease,
  gulpBase.tscTsSrc,
  gulpBase.cleanTranspiledCode,
  //gulpBase.transpileTypescriptToBuildDir,  // Test to see that typescript is transferred
  gulpBase.copySrcJsToBuildDir, // Test to see that js is copied
  //gulpBase.transpileTestTypescriptToTestingDir,
  gulpBase.copyTestJsToTestingDir,
  gulpBase.copyBuildTypescriptDeclarationToPublishDir,
  copyGulpBaseToPublishDir,
  gulpBase.copyPackageJsonToPublishDir);

export const cleanPublish = gulpBase.cleanPublish;
export const clean = gulpBase.clean;

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
