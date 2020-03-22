exports.npmInstallProject = function npmInstallProject(cb) {
  exec('npm install', {cwd: './'}, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  })
};
