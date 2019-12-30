// Define directories used in functions here which means they will execute from <project>/node_modules/@franzzemen/gulp-base
const releaseDir = '../../../release';
const buildDir = '../../../build';

function cleanRelease() {
  return del(releaseDir);
}

exports.cleanRelease = cleanRelease;
