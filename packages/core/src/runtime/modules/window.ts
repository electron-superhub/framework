import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import path from "node:path";

import { AppContext, AppModule } from "../../types";
import {
  AppModuleBase,
  DefaultAppRuntimeContext,
  ipcMainEvents,
  registerIpcMainEvent,
} from "../core";

const ipcMainEvents_window = {
  app_mainWindow_create: "app:main-window:create",
  app_mainWindow_show: "app:main-window:show",
} as const;

type IpcMainEvents_window = typeof ipcMainEvents_window;

declare module "../core" {
  interface DefaultAppRuntimeContext {
    setMainWindowWebContentsLoaded(): void;
  }

  interface IpcMainEvents extends IpcMainEvents_window {}
}

const ipcMainRendererEvents_window = {
  on: {
    mainWindow_urlQuerystring: "renderer:on:mainWindow:url-querystring",
  },
  send: {
    mainWindow_refreshUrl: "renderer:send:mainWindow:refresh-url",
  },
};

class AppWindowManager extends AppModuleBase implements AppModule {
  private mainWindow!: BrowserWindow;

  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.registerToIpcMainEvents();
    this.extendsRuntimeContext();

    this.mainWindow = this.createMainWindow();

    this.listenMainWindowEvents();
    this.dispatchRendererForwardEvents();

    this.registerToIpcRendererEvents();

    this.loadMainUrl(true);
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_window).forEach(([eventKey, eventName]) => {
      registerIpcMainEvent(eventKey, eventName);
    });
  }

  private extendsRuntimeContext() {
    DefaultAppRuntimeContext.addExtensionMethod(
      "setMainWindowWebContentsLoaded",
      function (): void {
        const runtimeKey_app_mainWindow =
          this.getCoreRuntimeKeys().app_mainWindow;

        this.updateRuntimeInfo(runtimeKey_app_mainWindow, { loaded: true });
      }
    );
  }

  // #region create window
  private createMainWindow() {
    const preloadPath = this.resolvePreloadPath();
    const options: BrowserWindowConstructorOptions = {
      width: 800,
      height: 600,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true, // 只有 context隔离 才能使用 动态 import导入
        sandbox: false, // preload脚本是 ES模块时，sandbox必须为false，并且 文件后缀名为mjs
      },
    };
    const mainWindow = this.createBrowserWindow(options);

    mainWindow.on("page-title-updated", (event) => {
      event.preventDefault(); // 阻止 窗口标题 跟随页面标题更新
    });

    // 主窗口关闭时 如启用托盘 则只隐藏窗口
    mainWindow.on("close", (event) => {
      if (
        this.runtimeContext.isTrayEnabled() &&
        !this.runtimeContext.isAppQuiting()
      ) {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    this.setRuntimeMainWindowCreated();

    return mainWindow;
  }

  private resolvePreloadPath() {
    const appRootPath = this.runtimeContext.getAppRootPath();

    return path.join(appRootPath, "dist", "electron", "preload.mjs");
  }

  private createBrowserWindow(options?: BrowserWindowConstructorOptions) {
    const packageInfo = this.runtimeContext.getAppPackageInfo();

    // 窗口 WM_CLASS = app.name.ToLowerASCII(),
    // app.name = packageInfo.productName ?? packageInfo.name, productName中文名 ToLowerASCII后 会被编码，
    // linux平台下 导致与 desktop文件中配置的 StartupWMClass 不匹配, 进而引起任务栏图标显示异常
    // 所以在 linux平台下 创建窗口前 临时设置 app.name = packageInfo.name 英文名，创建窗口后恢复
    this.runtimeContext.isLinuxPlatform() &&
      this.contextApp.setName(packageInfo.name);

    const newOptions: BrowserWindowConstructorOptions = {
      ...(options ?? {}),
      title: packageInfo.productName, // 设置窗口标题为 productName中文名
    };
    const newWindow = new BrowserWindow(newOptions);

    this.runtimeContext.isLinuxPlatform() &&
      this.contextApp.setName(packageInfo.productName);

    // 打开新窗口 替换为 调用当前函数
    newWindow.webContents.setWindowOpenHandler((details) => {
      return {
        action: "allow",
        createWindow: (options) => {
          const openWindow = this.createBrowserWindow(options);
          openWindow.loadURL(details.url);

          return openWindow.webContents;
        },
      };
    });

    return newWindow;
  }

  private setRuntimeMainWindowCreated() {
    const runtimeKey_app_mainWindow =
      this.runtimeContext.getCoreRuntimeKeys().app_mainWindow;

    this.runtimeContext.updateRuntimeInfo(runtimeKey_app_mainWindow, {
      created: true,
    });
  }
  // #endregion

  // #region listen & dispatch events
  private listenMainWindowEvents() {
    this.contextIpcMain.on(ipcMainEvents.app_open, () => {
      this.showMainWindow();
    });

    this.contextIpcMain.on(ipcMainEvents_window.app_mainWindow_show, () => {
      this.showMainWindow();
    });

    this.contextIpcMain.on(ipcMainEvents_window.app_mainWindow_create, () => {
      this.mainWindow = this.createMainWindow();

      this.loadMainUrl(false);
    });

    this.contextIpcMain.on(
      ipcMainRendererEvents_window.send.mainWindow_refreshUrl,
      () => {
        this.refreshMainUrl();
      }
    );

    this.contextApp.on("activate", () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        this.contextIpcMain.emit(ipcMainEvents_window.app_mainWindow_create);
      }
    });
  }

  private showMainWindow() {
    this.mainWindow.isMinimized() && this.mainWindow.restore();
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  private refreshMainUrl() {
    this.mainWindow.webContents.removeAllListeners("did-finish-load");

    this.loadMainUrl(false);
  }

  private dispatchRendererForwardEvents() {
    for (const forwardChannel of Object.values(
      this.runtimeContext.getIpcRendererOnEvents()
    )) {
      this.contextIpcMain.on(forwardChannel, (event, ...args) => {
        if (this.mainWindow.isDestroyed()) return;

        this.mainWindow.webContents.send(forwardChannel, ...args);
      });
    }
  }
  // #endregion

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererOnEvents(
      ipcMainRendererEvents_window.on
    );

    this.runtimeContext.registerIpcRendererSendEvents(
      ipcMainRendererEvents_window.send
    );
  }

  // #region load url
  private loadMainUrl(appStart: boolean) {
    const fullMainUrl = this.buildFullMainUrl(appStart);

    if (!fullMainUrl) return;

    this.mainWindow.loadURL(fullMainUrl.href);

    this.setRuntimeMainWindowUrlInfo(fullMainUrl);

    this.runtimeContext.isDevelopment() &&
      this.mainWindow.webContents.openDevTools();

    this.mainWindow.webContents.once("did-finish-load", () => {
      this.contextIpcMain.emit(
        ipcMainRendererEvents_window.on.mainWindow_urlQuerystring,
        null,
        fullMainUrl.search
      );
    });
  }

  private resolveMainUrl(): string {
    const mainWindowOptions = this.runtimeContext.getAppMainWindowOptions();

    const mainUrl_Prod = mainWindowOptions.prod_url ?? "";
    const mainUrl_Dev = mainWindowOptions.dev_url ?? mainUrl_Prod;

    return this.runtimeContext.isDevelopment() ? mainUrl_Dev : mainUrl_Prod;
  }

  private buildFullMainUrl(appStart: boolean) {
    const mainUrl = this.resolveMainUrl();

    if (!mainUrl) return null;

    const fullMainUrl = new URL(mainUrl);
    return fullMainUrl;
  }

  private setRuntimeMainWindowUrlInfo(mainUrl: URL) {
    const runtimeKey_app_mainWindow =
      this.runtimeContext.getCoreRuntimeKeys().app_mainWindow;

    this.runtimeContext.updateRuntimeInfo(runtimeKey_app_mainWindow, {
      mainUrl: {
        urlHref: mainUrl.href,
        queryParams: Object.fromEntries(mainUrl.searchParams.entries()),
      },
    });
  }
  // #endregion
}

export function manageWindows() {
  return new AppWindowManager();
}
