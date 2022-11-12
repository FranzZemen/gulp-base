import exec from 'child_process';
// const exec = require('child_process').exec;

export const npmCheckUpdates = function ncu(cb) {
  exec('npmCheckUpdates --packageFile package.json', {cwd: './'}, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  })
};

// Note this satisfies semver rules (will not update if semver rule does not allow)
export const ncuu = function ncuu(cb) {
  exec('npmCheckUpdates -u --packageFile package.json' +
    '',{cwd: './'}, (err, stdout, stderr) =>{
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
};
