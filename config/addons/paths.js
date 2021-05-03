const path = require('path');

const root = path.join(__dirname, '..', '..');

const resolve = (args) => {
  return path.join(root, ...args);
};

const getPaths = () => {
  return {
    buildPath: resolve(['build']),
    srcPath: resolve(['src']),
  };
};

module.exports = {
  getPaths,
  resolve,
};
