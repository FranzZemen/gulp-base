const del = require('del');
const fs = require('fs');
const src = require('gulp').src;
const dest = require('gulp').dest;
const series = require('gulp').series;
const exec = require('child_process').exec;
const packageJson = require('./package');

const _releaseDir = './release';

function _cleanRelease() {
  return del(_releaseDir);
}

function _copyJs ()  {
  return src('Gulpbase.js')
    .pipe(dest(_releaseDir));
};

function _copyPackageJson ()  {
  return src('./package.json')
    .pipe(dest(_releaseDir));
};

function _incrementJsonPatch(cb) {
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

function _publish(cb) {
  exec('npm publish release',{}, (err, stdout, stderr) =>{
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}



exports.patch = series(_cleanRelease, _copyJs, _incrementJsonPatch, _copyPackageJson, _publish);

