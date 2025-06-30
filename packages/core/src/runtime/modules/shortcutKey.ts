import { globalShortcut, BrowserWindow } from "electron";

import { AppContext, AppModule } from "../types";
import { AppModuleBase } from "../core";

class AppShortcutKeyManager extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.registerDevToolsShortcutKey();
    this.registerReloadShortcutKeys();

    this.contextApp.on("before-quit", () => {
      globalShortcut.unregisterAll();
    });
  }

  private registerDevToolsShortcutKey() {
    globalShortcut.register("CommandOrControl+Shift+I", () => {
      BrowserWindow.getFocusedWindow()?.webContents.toggleDevTools();
    });
  }

  private registerReloadShortcutKeys() {
    globalShortcut.register("CommandOrControl+R", () => {
      BrowserWindow.getFocusedWindow()?.webContents.reload();
    });

    globalShortcut.register("CommandOrControl+Shift+R", () => {
      BrowserWindow.getFocusedWindow()?.webContents.reloadIgnoringCache();
    });
  }
}

export function manageShortcutKeys() {
  return new AppShortcutKeyManager();
}
