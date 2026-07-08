import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { registerDashboardIpc } from "./ipc/dashboardIpc";
import { registerSettingsIpc } from "./ipc/settingsIpc";
import { createDatabase } from "./services/storage/database";
import { createRepositories } from "./services/storage/repositories";

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1220,
    height: 780,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f6f4ef",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  const database = createDatabase(join(app.getPath("userData"), "daily-assistant.sqlite"));
  const repositories = createRepositories(database);

  registerDashboardIpc();
  registerSettingsIpc(repositories);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
