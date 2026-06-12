const path = require("node:path");

function getTrayIconPath(baseDir = __dirname) {
  return path.join(baseDir, "assets", "tray.png");
}

function createTrayIconImage(nativeImage, baseDir = __dirname) {
  const icon = nativeImage.createFromPath(getTrayIconPath(baseDir));
  if (icon.isEmpty()) {
    throw new Error("托盘图标资源加载失败");
  }
  return icon;
}

module.exports = {
  createTrayIconImage,
  getTrayIconPath
};
