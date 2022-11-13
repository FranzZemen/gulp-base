import {deleteSync} from 'del';
import {cwd} from 'node:process';
import fs from 'fs';
import gulp from 'gulp';
import _ from 'lodash';
import {createRequire} from 'module';
import {simpleGit} from 'simple-git';
import * as gulpBase from './Gulpbase.js';
import {cjsDistDir, cleanBuild, cleanTesting, mjsDistDir, publishDir, testingCjsDir} from './Gulpbase.js';
import _default from './Gulpbase.js'


export const exp = 1;

const src = gulp.src;
const dest = gulp.dest;
const series = gulp.series;

const requireModule = createRequire(import.meta.url);
let packageJson = requireModule('./package.json');

gulpBase.init(packageJson, cwd(), 100);
gulpBase.setCleanTranspiled(true);



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

export function copyPackageJsonToPublishDir(cb) {
  try {
    fs.mkdirSync(publishDir);
  } catch (error) {
    if(error.code !== 'EEXIST') {
      cb(error);
    }
  }
  // Remove some top level properties, which would have the wrong paths for publishing
  delete packageJson.main;
  delete packageJson.module;
  delete packageJson.types;
  delete packageJson.exports;

  const publishPackageJSon = _.merge({}, packageJson);
  publishPackageJSon.main = 'Gulpbase.js';
  
  fs.writeFileSync(publishDir + '/package.json', JSON.stringify(publishPackageJSon, null, 2));
  cb();
}


// The default is to build the dummy stuff as any other module
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

// The real build is different than other modules

export const patch = series(
  gulpBase.cleanPublish,
  gulpBase.cleanBuild,
  gulpBase.cleanTesting,
  copyGulpBaseToPublishDir,
  gulpBase.incrementJsonPatch,
  copyPackageJsonToPublishDir,
  gulpBase.publish,
 // gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);


export const minor = series(
  gulpBase.cleanPublish,
  gulpBase.cleanBuild,
  gulpBase.cleanTesting,
  copyGulpBaseToPublishDir,
  gulpBase.incrementJsonMinor,
  copyPackageJsonToPublishDir,
  gulpBase.publish,
//  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);

export const major = series(
  gulpBase.cleanPublish,
  gulpBase.cleanBuild,
  gulpBase.cleanTesting,
  copyGulpBaseToPublishDir,
  gulpBase.incrementJsonMajor,
  copyPackageJsonToPublishDir,
  gulpBase.publish,
//  gulpBase.cleanPublish,
  gulpBase.gitAdd,
  gulpBase.gitCommit,
  gulpBase.gitPush);
