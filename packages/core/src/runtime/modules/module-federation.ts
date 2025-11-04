import { v4 as uuidv4 } from "uuid";

import { AppContext, AppModule } from "../../types";
import {
  AppModuleBase,
  DefaultAppRuntimeContext,
  ipcMainEvents,
} from "../core";

type IpcMainHandler = (
  event: Electron.IpcMainInvokeEvent,
  ...args: any[]
) => Promise<any> | any;

type IpcMainListener = (event: Electron.IpcMainEvent, ...args: any[]) => void;

declare module "../core" {
  interface DefaultAppRuntimeContext {
    registerIpcMainHandler(
      channel: string,
      handler: IpcMainHandler,
      moduleName?: string
    ): void;
    unregisterIpcMainHandler(channel: string): void;
    hasIpcMainHandler(channel: string): boolean;
    getIpcMainHandler(channel: string): IpcMainHandler | undefined;
    getIpcMainHandleModule(channel: string): string | undefined;
    listIpcMainHandleChannels(): string[];
    registerIpcMainListener(
      channel: string,
      listener: IpcMainListener,
      moduleName?: string
    ): void;
    unregisterIpcMainListener(channel: string, listener: IpcMainListener): void;
    removeIpcMainAllListeners(channel?: string): void;
    hasIpcMainListener(channel: string, moduleName?: string): boolean;
    listIpcMainListenModules(
      channel: string,
      exceptInternal?: boolean
    ): string[];
  }
}

const runtimeKeys = {
  app_ipcMain: "app:ipc-main",
};

class AppModuleFederation extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.extendsRuntimeContext();
    this.installIpcMainHandlePatch();
    this.installIpcMainListenPatch();

    this.handleAppIpcRendererFederationEvents();
  }

  // #region runtimeContext extends
  private extendsRuntimeContext() {
    DefaultAppRuntimeContext.addExtensionMethod(
      "registerIpcMainHandler",
      function (
        channel: string,
        handler: IpcMainHandler,
        moduleName?: string
      ): void {
        moduleName ??= `<internal>`;

        this.updateRuntimeInfoSubValue(runtimeKeys.app_ipcMain, ["handlers"], {
          [channel]: [moduleName, handler],
        });
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "unregisterIpcMainHandler",
      function (channel: string): void {
        this.updateRuntimeInfoSubValue(runtimeKeys.app_ipcMain, ["handlers"], {
          [channel]: null,
        });
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "hasIpcMainHandler",
      function (channel: string): boolean {
        const channelHandlerObj = this.getRuntimeInfoSubValue(
          runtimeKeys.app_ipcMain,
          ["handlers", channel]
        );

        return !!channelHandlerObj;
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getIpcMainHandler",
      function (channel: string): IpcMainHandler | undefined {
        const channelHandlerObj = this.getRuntimeInfoSubValue(
          runtimeKeys.app_ipcMain,
          ["handlers", channel]
        );

        if (channelHandlerObj)
          return (channelHandlerObj as [string, IpcMainHandler])[1];
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getIpcMainHandleModule",
      function (channel: string): string | undefined {
        const channelHandlerObj = this.getRuntimeInfoSubValue(
          runtimeKeys.app_ipcMain,
          ["handlers", channel]
        );

        if (channelHandlerObj)
          return (channelHandlerObj as [string, IpcMainHandler])[0];
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "listIpcMainHandleChannels",
      function (): string[] {
        const ipcMainHandlerMap =
          this.getRuntimeInfoSubValue(runtimeKeys.app_ipcMain, ["handlers"]) ??
          {};

        return Object.entries(ipcMainHandlerMap)
          .filter(([, handlerObj]) => !!handlerObj)
          .map(([channel]) => channel);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "registerIpcMainListener",
      function (
        channel: string,
        listener: IpcMainListener,
        moduleName?: string
      ): void {
        moduleName ??= `<internal>-${uuidv4().replace(/-/g, "")}`;

        this.updateRuntimeInfoSubValue(
          runtimeKeys.app_ipcMain,
          ["listeners", channel],
          {
            [moduleName]: listener,
          }
        );
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "unregisterIpcMainListener",
      function (channel: string, listener: IpcMainListener): void {
        const channelListenerMap =
          this.getRuntimeInfoSubValue(runtimeKeys.app_ipcMain, [
            "listeners",
            channel,
          ]) ?? {};

        const matchModuleNames: string[] = [];

        Object.entries(channelListenerMap).forEach(
          ([moduleName, moduleListener]) => {
            if (moduleListener === listener) matchModuleNames.push(moduleName);
          }
        );

        matchModuleNames.forEach((moduleName) => {
          this.updateRuntimeInfoSubValue(
            runtimeKeys.app_ipcMain,
            ["listeners", channel],
            {
              [moduleName]: null,
            }
          );
        });
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "removeIpcMainAllListeners",
      function (channel?: string): void {
        if (channel) {
          this.updateRuntimeInfoSubValue(
            runtimeKeys.app_ipcMain,
            ["listeners"],
            {
              [channel]: {},
            }
          );
        } else {
          this.updateRuntimeInfo(runtimeKeys.app_ipcMain, {
            listeners: {},
          });
        }
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "hasIpcMainListener",
      function (channel: string, moduleName?: string): boolean {
        const channelListenerMap =
          this.getRuntimeInfoSubValue(runtimeKeys.app_ipcMain, [
            "listeners",
            channel,
          ]) ?? {};

        if (moduleName) {
          return !!channelListenerMap[moduleName];
        } else {
          return Object.entries(channelListenerMap).some(
            ([, listener]) => !!listener
          );
        }
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "listIpcMainListenModules",
      function (channel: string, exceptInternal: boolean = false): string[] {
        const channelListenerMap =
          this.getRuntimeInfoSubValue(runtimeKeys.app_ipcMain, [
            "listeners",
            channel,
          ]) ?? {};

        const listenModules = Object.entries(channelListenerMap)
          .filter(([, listener]) => !!listener)
          .map(([moduleName]) =>
            moduleName.startsWith("<internal>") ? "internal" : moduleName
          );
        const uniqueListenModules = [...new Set(listenModules)];

        if (exceptInternal) {
          return uniqueListenModules.filter(
            (moduleName) => moduleName !== "internal"
          );
        } else {
          return uniqueListenModules;
        }
      }
    );
  }
  // #endregion

  // #region ipcMain patch
  private installIpcMainHandlePatch() {
    const contextIpcMain = this.contextIpcMain;

    if (contextIpcMain.__handlePatched) return;

    contextIpcMain.__handlePatched = true;

    // get original methods
    const _ipcMainHandle = contextIpcMain.handle.bind(contextIpcMain);
    const _ipcMainRemoveHandler =
      contextIpcMain.removeHandler.bind(contextIpcMain);

    contextIpcMain.handle = (channel, handler, moduleName?: string) => {
      _ipcMainHandle(channel, handler);

      this.runtimeContext.registerIpcMainHandler(channel, handler, moduleName);
    };

    contextIpcMain.removeHandler = (channel) => {
      _ipcMainRemoveHandler(channel);

      this.runtimeContext.unregisterIpcMainHandler(channel);
    };

    contextIpcMain.hasHandler = (channel) =>
      this.runtimeContext.hasIpcMainHandler(channel);

    contextIpcMain.invokeHandle = (channel, event, ...args) => {
      const handler = this.runtimeContext.getIpcMainHandler(channel);

      if (handler) return handler(event, ...args);

      return new Error(`No handler found for channel: ${channel}`);
    };

    contextIpcMain.handleModule = (channel: string) =>
      this.runtimeContext.getIpcMainHandleModule(channel);

    contextIpcMain.handleChannels = () =>
      this.runtimeContext.listIpcMainHandleChannels();
  }

  private installIpcMainListenPatch() {
    const contextIpcMain = this.contextIpcMain;

    if (contextIpcMain.__listenPatched) return;

    contextIpcMain.__listenPatched = true;

    // get original methods
    const _ipcMainOn = contextIpcMain.on.bind(contextIpcMain);
    const _ipcMainOff = contextIpcMain.off.bind(contextIpcMain);
    const _ipcMainRemoveAllListeners =
      contextIpcMain.removeAllListeners.bind(contextIpcMain);

    contextIpcMain.on = (channel, listener, moduleName?: string) => {
      _ipcMainOn(channel, listener);

      this.runtimeContext.registerIpcMainListener(
        channel,
        listener,
        moduleName
      );

      return contextIpcMain;
    };

    contextIpcMain.addListener = (channel, listener, moduleName?: string) =>
      contextIpcMain.on(channel, listener, moduleName);

    contextIpcMain.off = (channel, listener) => {
      _ipcMainOff(channel, listener);

      this.runtimeContext.unregisterIpcMainListener(channel, listener);

      return contextIpcMain;
    };

    contextIpcMain.removeListener = (channel, listener) =>
      contextIpcMain.off(channel, listener);

    contextIpcMain.removeAllListeners = (channel) => {
      _ipcMainRemoveAllListeners(channel);

      this.runtimeContext.removeIpcMainAllListeners(channel);

      return contextIpcMain;
    };

    contextIpcMain.hasListener = (channel, moduleName?: string) =>
      this.runtimeContext.hasIpcMainListener(channel, moduleName);

    contextIpcMain.listenModules = (channel, exceptInternal = false) =>
      this.runtimeContext.listIpcMainListenModules(channel, exceptInternal);
  }
  // #endregion

  private handleAppIpcRendererFederationEvents() {
    this.contextIpcMain.on(
      ipcMainEvents.app_moduleFederation_send,
      (event, channel, ...args) => {
        //Todo: Ensure确保 所有该channel的 listener都已经注册

        this.contextIpcMain.emit(channel, event, ...args);
      }
    );

    this.contextIpcMain.handle(
      ipcMainEvents.app_moduleFederation_invoke,
      (event, channel, ...args) => {
        //Todo: Ensure确保 该channel的 handler已经注册

        if (this.contextIpcMain.hasHandler(channel)) {
          return this.contextIpcMain.invokeHandle(channel, event, ...args);
        }

        //Todo: 对应channel没有handler, 输出错误日志 到渲染进程console
      }
    );
  }

  private ensureChannelListeners(channel: string) {
    const currentListenModules = this.contextIpcMain.listenModules(
      channel,
      true
    );

    //Todo: 获取 listen该channel的 remote modules
  }

  private ensureChannelHandler(channel: string) {
    const currentHandleModule = this.contextIpcMain.handleModule(channel);

    //Todo: 获取 handle该channel的 remote module
  }
}

export function initModuleFederation() {
  return new AppModuleFederation();
}
