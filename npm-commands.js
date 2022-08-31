import exec from 'child_process';

//const exec = require('child_process').exec;

export const npmInstallProject = function npmInstallProject(cb) {
  exec('npm install', {cwd: './'}, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  })
};

// Note this satisfies semver rules (will not update if semver rule does not allow)
export const npmUpdateProject = function npmUpdateProject(cb) {
  exec('npm update',{cwd: './'}, (err, stdout, stderr) =>{
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
};
