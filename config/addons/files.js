const path = require('path');
const fs = require('fs-extra');

const paths = require('./paths');

const getFilesFromDir = (dir, fileTypes) => {
  const filesToReturn = [];
  const files = fs.readdirSync(dir);

  for (const i in files) {
    const curFile = path.join(dir, files[i]);
    const isFile = fs.statSync(curFile).isFile();
    if (isFile && fileTypes.indexOf(path.extname(curFile)) !== -1) {
      filesToReturn.push(curFile);
    }
  }

  return filesToReturn;
};

const getConfig = () => {
  const buildConfig = JSON.parse(fs.readFileSync(paths.resolve(['buildConfig.json'])));
  return buildConfig;
};

module.exports = {
  getFilesFromDir,
  getConfig,
};
