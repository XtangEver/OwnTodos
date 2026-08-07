const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { shouldHideOnClose } = require("./lifecycle.cjs");
const { createLogger } = require("./logger.cjs");
const { createTrayIconImage, getTrayIconPath } = require("./trayIcon.cjs");

let mainWindow;
let tray;
let isQuitting = false;
let logger;

app.disableHardwareAcceleration();

function getTasksFilePath() {
  return path.join(app.getPath("userData"), "tasks.json");
}

async function readTasksFile() {
  try {
    const raw = await fs.readFile(getTasksFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeTasksFile(tasks) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(getTasksFilePath(), JSON.stringify(safeTasks, null, 2), "utf8");
  return { ok: true };
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  mainWindow.show();
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

function createTray() {
  if (tray) {
    return true;
  }

  try {
    const icon = createTrayIconImage(nativeImage, app);
    if (!icon) {
      logger?.write("托盘图标为空，跳过托盘创建");
      return false;
    }

    tray = new Tray(icon);
    tray.setToolTip("OwnTodos");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "打开",
          click: showMainWindow
        },
        {
          label: "退出",
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ])
    );
    tray.on("click", showMainWindow);
    return true;
  } catch (error) {
    logger?.write("托盘创建失败，应用将不进入后台托盘模式", error);
    tray = null;
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 860,
    minHeight: 620,
    title: "OwnTodos",
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#f2f4f7", symbolColor: "#3a4048", height: 40 },
    icon: getTrayIconPath({
      baseDir: __dirname,
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath
    }),
    backgroundColor: "#f2f4f7",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("close", (event) => {
    if (shouldHideOnClose({ isQuitting, hasTray: Boolean(tray) })) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    logger?.write(`渲染进程退出：${details.reason}`);
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logger?.write(`页面加载失败：${errorCode} ${errorDescription} ${validatedURL}`);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  logger = createLogger(app);
  logger.write("OwnTodos 启动");
  process.on("uncaughtException", (error) => {
    logger?.write("未捕获异常", error);
  });
  process.on("unhandledRejection", (error) => {
    logger?.write("未处理 Promise 拒绝", error);
  });

  Menu.setApplicationMenu(null);
  ipcMain.handle("tasks:load", readTasksFile);
  ipcMain.handle("tasks:save", (_event, tasks) => writeTasksFile(tasks));

  createWindow();
  createTray();

  app.on("activate", () => {
    showMainWindow();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (isQuitting && process.platform !== "darwin") {
    app.quit();
  }
});
