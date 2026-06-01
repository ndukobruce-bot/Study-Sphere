const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const webRoot = path.join(__dirname, "..", "desktop-web");

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 720,
    backgroundColor: "#070711",
    title: "StudySphere",
    icon: path.join(__dirname, "assets", "studysphere.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.loadFile(path.join(webRoot, "index.html"));

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("file://")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("file://")) return;
    event.preventDefault();
    shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
