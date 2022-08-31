import exec from 'child_process';
// const exec = require('child_process').exec;

export const ncu = function ncu(cb) {
  exec('ncu --packageFile package.json', {cwd: './'}, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  })
};

// Note this satisfies semver rules (will not update if semver rule does not allow)
export const ncuu = function ncuu(cb) {
  exec('ncu -u --packageFile package.json' +
    '',{cwd: './'}, (err, stdout, stderr) =>{
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
};
