const ncu = require('npm-check-updates');

exports.ncu = function() {
  return ncu.run({
  }).then(toBeUpgraded => {
    console.log(toBeUpgraded);
  });
};

exports.ncuu = function() {
  return ncu.run({
    upgrade: true
  }).then(upgraded => {
    console.log(upgraded);
  })
};
