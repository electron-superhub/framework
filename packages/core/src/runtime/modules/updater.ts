import electronUpdater from "electron-updater";

import { AppContext, AppModule } from "../../types";
import { AppModuleBase, ipcMainEvents, registerIpcMainEvent } from "../core";

const { autoUpdater } = electronUpdater;

const ipcMainEvents_updater = {
  app_checkUpdate: "app:check-update",
  app_downloadUpdate: "app:download-update",
  app_installUpdate: "app:install-update",
} as const;

type IpcMainEvents_updater = typeof ipcMainEvents_updater;

declare module "../core" {
  interface IpcMainEvents extends IpcMainEvents_updater {}
}

const ipcMainRendererEvents_updater = {
  on: {
    updater_checkingUpdate: "renderer:on:updater:checking-update",
    updater_updateAvailable: "renderer:on:updater:update-available",
    updater_updateNotAvailable: "renderer:on:updater:update-not-available",
    updater_error: "renderer:on:updater:error",
    updater_downloadProgress: "renderer:on:updater:download-progress",
    updater_updateDownloaded: "renderer:on:updater:update-downloaded",
  },
  send: {
    ...ipcMainEvents_updater,
  },
};

class AppUpdaterHandler extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.registerToIpcMainEvents();

    this.configureUpdater();

    this.dispatchUpdaterEvents();
    this.listenAppUpdateEvents();

    this.registerToIpcRendererEvents();
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_updater).forEach(([eventKey, eventName]) => {
      registerIpcMainEvent(eventKey, eventName);
    });
  }

  private configureUpdater() {
    // 关闭自动下载
    autoUpdater.autoDownload = false;
    // 开发环境下 启用自动更新
    autoUpdater.forceDevUpdateConfig = true;
    // 应用退出后自动安装
    autoUpdater.autoInstallOnAppQuit = true;
  }

  private dispatchUpdaterEvents() {
    autoUpdater.on("checking-for-update", () => {
      this.contextIpcMain.emit(
        ipcMainRendererEvents_updater.on.updater_checkingUpdate
      );
    });
    autoUpdater.on("update-available", (info) => {
      this.contextIpcMain.emit(
        ipcMainRendererEvents_updater.on.updater_updateAvailable,
        null,
        info
      );
    });
    autoUpdater.on("update-not-available", (info) => {
      this.contextIpcMain.emit(
        ipcMainRendererEvents_updater.on.updater_updateNotAvailable,
        null,
        info
      );
    });
    autoUpdater.on("error", (err, msg) => {
      this.contextIpcMain.emit(
        ipcMainRendererEvents_updater.on.updater_error,
        null,
        err,
        msg
      );
    });
    autoUpdater.on("download-progress", (progressInfo) => {
      this.contextIpcMain.emit(
        ipcMainRendererEvents_updater.on.updater_downloadProgress,
        null,
        progressInfo
      );
    });
    autoUpdater.on("update-downloaded", (event) => {
      this.contextIpcMain.emit(
        ipcMainRendererEvents_updater.on.updater_updateDownloaded,
        null,
        event
      );
    });
  }

  private listenAppUpdateEvents() {
    this.contextIpcMain.on(ipcMainEvents_updater.app_checkUpdate, () => {
      autoUpdater.checkForUpdates();
    });

    this.contextIpcMain.on(ipcMainEvents_updater.app_downloadUpdate, () => {
      autoUpdater.downloadUpdate();
    });

    this.contextIpcMain.on(ipcMainEvents_updater.app_installUpdate, () => {
      // 直接触发 应用退出Event 在app quit后 会自动安装更新
      this.contextIpcMain.emit(ipcMainEvents.app_quit);
    });
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererOnEvents(
      ipcMainRendererEvents_updater.on
    );

    this.runtimeContext.registerIpcRendererSendEvents(
      ipcMainRendererEvents_updater.send
    );
  }
}

export function handleUpdater() {
  return new AppUpdaterHandler();
}
