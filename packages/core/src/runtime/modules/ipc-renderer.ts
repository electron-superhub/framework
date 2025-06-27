import { AppContext, AppModule } from "../types";
import {
  AppModuleBase,
  DefaultAppRuntimeContext,
  registerIpcMainEvent,
} from "../core";

const ipcMainEvents_ipcRenderer = {
  app_getRendererEvents: "app:get-renderer-events",
} as const;

type IpcMainEvents_ipcRenderer = typeof ipcMainEvents_ipcRenderer;

declare module "../core" {
  interface DefaultAppRuntimeContext {
    getIpcRendererOnEvents(): Record<string, string>;
    getIpcRendererSendEvents(): Record<string, string>;
    getIpcRendererInvokeEvents(): Record<string, string>;
    registerIpcRendererOnEvents(onEvents: Record<string, string>): void;
    registerIpcRendererSendEvents(sendEvents: Record<string, string>): void;
    registerIpcRendererInvokeEvents(invokeEvents: Record<string, string>): void;
  }

  interface IpcMainEvents extends IpcMainEvents_ipcRenderer {}
}

const runtimeKeys = {
  app_ipcRenderer: "app:ipc-renderer",
};

class AppIpcRendererManager extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.registerToIpcMainEvents();
    this.extendsRuntimeContext();

    this.handleAppIpcRendererManageEvents();
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_ipcRenderer).forEach(
      ([eventKey, eventName]) => {
        registerIpcMainEvent(eventKey, eventName);
      }
    );
  }

  private extendsRuntimeContext() {
    DefaultAppRuntimeContext.addExtensionMethod(
      "getIpcRendererOnEvents",
      function (): Record<string, string> {
        return (
          this.getRuntimeInfoSubValue(runtimeKeys.app_ipcRenderer, [
            "onEvents",
          ]) ?? {}
        );
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getIpcRendererSendEvents",
      function (): Record<string, string> {
        return (
          this.getRuntimeInfoSubValue(runtimeKeys.app_ipcRenderer, [
            "sendEvents",
          ]) ?? {}
        );
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getIpcRendererInvokeEvents",
      function (): Record<string, string> {
        return (
          this.getRuntimeInfoSubValue(runtimeKeys.app_ipcRenderer, [
            "invokeEvents",
          ]) ?? {}
        );
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "registerIpcRendererOnEvents",
      function (onEvents: Record<string, string>) {
        this.updateRuntimeInfoSubValue(
          runtimeKeys.app_ipcRenderer,
          ["onEvents"],
          onEvents
        );
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "registerIpcRendererSendEvents",
      function (sendEvents: Record<string, string>) {
        this.updateRuntimeInfoSubValue(
          runtimeKeys.app_ipcRenderer,
          ["sendEvents"],
          sendEvents
        );
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "registerIpcRendererInvokeEvents",
      function (invokeEvents: Record<string, string>) {
        this.updateRuntimeInfoSubValue(
          runtimeKeys.app_ipcRenderer,
          ["invokeEvents"],
          invokeEvents
        );
      }
    );
  }

  private handleAppIpcRendererManageEvents() {
    this.contextIpcMain.handle(
      ipcMainEvents_ipcRenderer.app_getRendererEvents,
      () => {
        return {
          onEvents: this.runtimeContext.getIpcRendererOnEvents(),
          sendEvents: this.runtimeContext.getIpcRendererSendEvents(),
          invokeEvents: this.runtimeContext.getIpcRendererInvokeEvents(),
        };
      }
    );
  }
}

export function manageIpcRenderer() {
  return new AppIpcRendererManager();
}
