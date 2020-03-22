const ncu = require('npm-check-updates');

exports.ncu = function() {
  ncu.run({
  });
};

exports.ncuu = function() {
  ncu.run({
    upgrade: true
  });
};
