const path = require("path");

const projectRoot = process.pkg
  ? path.dirname(process.execPath)
  : path.resolve(__dirname, "..", "..", "..");

module.exports = Object.freeze({
  projectRoot,
  clientDir: path.join(projectRoot, "src", "client"),
  assetsDir: path.join(projectRoot, "assets"),
  docsDir: path.join(projectRoot, "docs"),
  dataDir: path.join(projectRoot, "data"),
  outputDir: path.join(projectRoot, "output"),
});
