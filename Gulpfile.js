import {deleteSync} from 'del';
import gulp from 'gulp';
import {createRequire} from 'module';
import {simpleGit} from 'simple-git';
import * as gulpBase from './Gulpbase.js';
import {cjsDistDir, mjsDistDir, publishDir} from './Gulpbase.js';
import _default from './Gulpbase.js'

export const exp = 1;

const src = gulp.src;
const dest = gulp.dest;
const series = gulp.series;

const requireModule = createRequire(import.meta.url);
gulpBase.init(requireModule('./package.json'), requireModule('./package.dist.json'), 100, 'master');
gulpBase.setCleanTranspiled(true);

const git = simpleGit({
  baseDir: process.cwd(),
  binary: 'git',
  maxConcurrentProcesses: 6,
  trimmed: false
});
const branches = await git.branchLocal();
if (branches && branches.current) {
  gulpBase.setMainBranch(branches.current);
} else {
  gulpBase.setMainBranch('master');
}


// For this one Npm package, src (Gulpbase.js) is not in src, so need local copy function.
function copyGulpBaseToPublishDir() {
  return src([
    './Gulpbase.js',
    './npm-commands.js',
    './npm-check-updates.js'])
    .pipe(dest(gulpBase.publishDir));
}

function cleanPublishExtras(cb) {
  deleteSync(`${mjsDistDir}/someTsDir`);
  deleteSync(`${mjsDistDir}/clean-export*.*`);
  deleteSync(`${cjsDistDir}/someTsDir`);
  deleteSync(`${cjsDistDir}/clean-export*.*`);
  cb();
}
export default  _default;
/*
export default series(
  gulpBase.tscTsSrc,
  gulpBase.cleanTranspiledSrc,
  //gulpBase.transpileTypescriptToBuildDir,  // Test to see that typescript is transferred
  gulpBase.copySrcJsToBuildDir, // Test to see that js is copied
  //gulpBase.transpileTestTypescriptToTestingDir,
  gulpBase.copyTestJsToTestingDir,
  gulpBase.copyBuildTypescriptDeclarationToPublishDir,
  copyGulpBaseToPublishDir,
  gulpBase.copyPackageJsonsToPublishDir);
*/

export const test = gulpBase.test;
export const cleanPublish = gulpBase.cleanPublish;
export const clean = gulpBase.clean;

export const patch = series(
  gulpBase.cleanPublish,
  copyGulpBaseToPublishDir,
  gulpBase.incrementJsonPatch,
  gulpBase.copyPackageJsonsToPublishDir,
  gulpBase.publish,
  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);


export const minor = series(
  gulpBase.cleanPublish,
  copyGulpBaseToPublishDir,
  gulpBase.incrementJsonMinor,
  gulpBase.copyPackageJsonsToPublishDir,
  gulpBase.publish,
  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);

export const major = series(
  gulpBase.cleanPublish,
  copyGulpBaseToPublishDir,
  gulpBase.incrementJsonMajor,
  gulpBase.copyPackageJsonsToPublishDir,
  gulpBase.publish,
  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);
