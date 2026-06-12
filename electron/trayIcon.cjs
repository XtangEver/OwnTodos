const path = require("node:path");

function getTrayIconPath(options = {}) {
  const {
    baseDir = __dirname,
    isPackaged = false,
    resourcesPath = ""
  } = options;

  if (isPackaged) {
    return path.join(resourcesPath, "assets", "tray.ico");
  }

  return path.join(baseDir, "assets", "tray.ico");
}

function createTrayIconImage(nativeImage, app, baseDir = __dirname) {
  const icon = nativeImage.createFromPath(
    getTrayIconPath({
      baseDir,
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath
    })
  );

  if (icon.isEmpty()) {
    return null;
  }

  return icon;
}

module.exports = {
  createTrayIconImage,
  getTrayIconPath
};
