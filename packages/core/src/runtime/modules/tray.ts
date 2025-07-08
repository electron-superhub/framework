import { Menu, Tray } from "electron";
import path from "node:path";

import { AppContext, AppModule } from "../../types";
import {
  AppModuleBase,
  DefaultAppRuntimeContext,
  ipcMainEvents,
} from "../core";

declare module "../core" {
  interface DefaultAppRuntimeContext {
    isTrayEnabled(): boolean;
  }
}

class AppTrayCreator extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.extendsRuntimeContext();

    this.createTray();
    this.setRuntimeEnableTray();
  }

  private extendsRuntimeContext() {
    DefaultAppRuntimeContext.addExtensionMethod(
      "isTrayEnabled",
      function (): boolean {
        const runtimeKey_app_quit = this.getCoreRuntimeKeys().app_quit;

        return (
          this.getRuntimeInfoSubValue(runtimeKey_app_quit, ["trayed"]) ?? false
        );
      }
    );
  }

  private createTray() {
    const iconPath = this.resolveTrayIconPath();

    const tray = new Tray(iconPath);

    // 设置托盘图标的悬停提示
    tray.setToolTip(this.contextApp.name);

    // 创建一个右键菜单
    const contextMenu = Menu.buildFromTemplate([
      { label: "显示窗口", click: () => this.showMainWindow() },
      { type: "separator" },
      { label: "退出", click: () => this.quitApp() },
    ]);

    // 将菜单设置为托盘图标的上下文菜单
    tray.setContextMenu(contextMenu);

    // 监听托盘图标的点击事件
    tray.on("click", (event) => this.showMainWindow());
  }

  private resolveTrayIconPath() {
    const appRootPath = this.runtimeContext.getAppRootPath();
    const trayIconsPath = path.join(appRootPath, "resources", "tray", "icons");

    let iconPath = "";
    if (this.runtimeContext.isWindowsPlatform()) {
      iconPath = path.join(trayIconsPath, "icon_16x16.ico");
    } else if (this.runtimeContext.isMacPlatform()) {
      iconPath = path.join(trayIconsPath, "icon_32x32.png");
    } else {
      iconPath = path.join(trayIconsPath, "icon_16x16.png");
    }
    return iconPath;
  }

  private showMainWindow() {
    this.contextIpcMain.emit(ipcMainEvents.app_mainWindow_show);
  }

  private quitApp() {
    this.contextIpcMain.emit(ipcMainEvents.app_quit);
  }

  private setRuntimeEnableTray() {
    const runtimeKey_app_quit =
      this.runtimeContext.getCoreRuntimeKeys().app_quit;

    this.runtimeContext.updateRuntimeInfo(runtimeKey_app_quit, {
      trayed: true,
    });
  }
}

export function createTray() {
  return new AppTrayCreator();
}
