import { AppContext, AppModule } from "../../types";
import {
  AppModuleBase,
  DefaultAppRuntimeContext,
  registerIpcMainEvent,
} from "../core";

const ipcMainEvents_core = {
  app_open: "app:open",
  app_quit: "app:quit",
} as const;

type IpcMainEvents_core = typeof ipcMainEvents_core;

declare module "../core" {
  interface DefaultAppRuntimeContext {
    getCoreRuntimeKeys(): typeof runtimeKeys_core;
    isAppQuiting(): boolean;
    isMainWindowCreated(): boolean;
    isMainWindowWebContentsLoaded(): boolean;
  }

  interface IpcMainEvents extends IpcMainEvents_core {}
}

const runtimeKeys_core = {
  app_open: "app:open",
  app_quit: "app:quit",
  app_mainWindow: "app:main-window",
} as const;

class AppCoreInitializer extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.registerToIpcMainEvents();
    this.extendsRuntimeContext();

    this.listenAppQuitEvents();
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_core).forEach(([eventKey, eventName]) => {
      registerIpcMainEvent(eventKey, eventName);
    });
  }

  private extendsRuntimeContext() {
    DefaultAppRuntimeContext.addExtensionMethod(
      "getCoreRuntimeKeys",
      function (): typeof runtimeKeys_core {
        return { ...runtimeKeys_core };
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "isAppQuiting",
      function (): boolean {
        return (
          this.getRuntimeInfoSubValue(runtimeKeys_core.app_quit, ["quiting"]) ??
          false
        );
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "isMainWindowCreated",
      function (): boolean {
        return (
          this.getRuntimeInfoSubValue(runtimeKeys_core.app_mainWindow, [
            "created",
          ]) ?? false
        );
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "isMainWindowWebContentsLoaded",
      function (): boolean {
        return (
          this.getRuntimeInfoSubValue(runtimeKeys_core.app_mainWindow, [
            "loaded",
          ]) ?? false
        );
      }
    );
  }

  private listenAppQuitEvents() {
    this.contextIpcMain.on(ipcMainEvents_core.app_quit, () => {
      this.setRuntimeAppQuiting();

      this.contextApp.quit();
    });

    this.contextApp.on("window-all-closed", () => {
      if (!this.runtimeContext.isMacPlatform()) {
        this.contextIpcMain.emit(ipcMainEvents_core.app_quit);
      }
    });
  }

  private setRuntimeAppQuiting() {
    this.runtimeContext.updateRuntimeInfo(runtimeKeys_core.app_quit, {
      quiting: true,
    });
  }
}

export function initAppCore() {
  return new AppCoreInitializer();
}
