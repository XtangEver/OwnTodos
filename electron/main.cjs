const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createTrayIconImage } = require("./trayIcon.cjs");

let mainWindow;
let tray;
let isQuitting = false;

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
    return;
  }

  const icon = createTrayIconImage(nativeImage);

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
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 860,
    minHeight: 620,
    title: "OwnTodos",
    backgroundColor: "#f5f7f9",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  ipcMain.handle("tasks:load", readTasksFile);
  ipcMain.handle("tasks:save", (_event, tasks) => writeTasksFile(tasks));

  createTray();
  createWindow();

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
