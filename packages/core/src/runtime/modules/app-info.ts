import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  AppContext,
  AppModule,
  AppInfo,
  AppMetaInfo,
  AppWindowOptions,
  AppProtocolOptions,
  AppPublishOptions,
} from "../../types";
import {
  AppModuleBase,
  DefaultAppRuntimeContext,
  registerIpcMainEvent,
} from "../core";

const ipcMainEvents_info = {
  app_getMetaInfo: "app:get-meta-info",
  app_getMainWindowOptions: "app:get-mainWindow-options",
  app_getProtocolOptions: "app:get-protocol-options",
  app_getPublishOptions: "app:get-publish-options",
  app_getPluginsPublishOptions: "app:get-plugins-publish-options",
} as const;

type IpcMainEvents_info = typeof ipcMainEvents_info;

declare module "../core" {
  interface DefaultAppRuntimeContext {
    getAppMetaInfo(): AppMetaInfo;
    getAppMainWindowOptions(): AppWindowOptions;
    getAppProtocolOptions(): AppProtocolOptions;
    getAppPublishOptions(): AppPublishOptions;
    getAppPluginsPublishOptions(): AppPublishOptions;
  }

  interface IpcMainEvents extends IpcMainEvents_info {}
}

const runtimeKeys = {
  app_info: "app:info",
};

const ipcMainRendererEvents_info = {
  invoke: {
    app_getMetaInfo: ipcMainEvents_info.app_getMetaInfo,
  },
};

class AppInfoResolver extends AppModuleBase implements AppModule {
  async init(context: AppContext): Promise<void> {
    super.load(context);

    this.registerToIpcMainEvents();

    const appRootPath: string = this.runtimeContext.getAppRootPath();
    const appInfoJson = await this.loadAppInfoJson(appRootPath);
    this.setRuntimeAppInfo(appInfoJson);

    this.extendsRuntimeContext();

    this.handleAppInfoEvents();

    this.registerToIpcRendererEvents();
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_info).forEach(([eventKey, eventName]) => {
      registerIpcMainEvent(eventKey, eventName);
    });
  }

  private async loadAppInfoJson(appRootPath: string) {
    const appInfoJsonPath = path.join(appRootPath, "app.json");
    const appInfoJsonFileUrl = pathToFileURL(appInfoJsonPath);

    const { default: appInfoJson } = await import(appInfoJsonFileUrl.href, {
      with: { type: "json" },
    });
    return appInfoJson;
  }

  private setRuntimeAppInfo(appInfoJson: any) {
    const appInfo = appInfoJson as AppInfo;

    this.runtimeContext.setRuntimeInfo(runtimeKeys.app_info, appInfo);
  }

  private extendsRuntimeContext() {
    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppMetaInfo",
      function (): AppMetaInfo {
        const appInfo = this.getRuntimeInfo(runtimeKeys.app_info) as AppInfo;

        const { windows, protocol, publish, plugins, ...metaInfo } = appInfo;
        return metaInfo as AppMetaInfo;
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppMainWindowOptions",
      function (): AppWindowOptions {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_info, [
          "windows",
          "main",
        ]) as AppWindowOptions;
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppProtocolOptions",
      function (): AppProtocolOptions {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_info, [
          "protocol",
        ]) as AppProtocolOptions;
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppPublishOptions",
      function (): AppPublishOptions {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_info, [
          "publish",
        ]) as AppPublishOptions;
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppPluginsPublishOptions",
      function (): AppPublishOptions {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_info, [
          "plugins",
          "publish",
        ]) as AppPublishOptions;
      }
    );
  }

  private handleAppInfoEvents() {
    this.contextIpcMain.handle(ipcMainEvents_info.app_getMetaInfo, () =>
      this.runtimeContext.getAppMetaInfo()
    );

    this.contextIpcMain.handle(
      ipcMainEvents_info.app_getMainWindowOptions,
      () => this.runtimeContext.getAppMainWindowOptions()
    );

    this.contextIpcMain.handle(ipcMainEvents_info.app_getProtocolOptions, () =>
      this.runtimeContext.getAppProtocolOptions()
    );

    this.contextIpcMain.handle(ipcMainEvents_info.app_getPublishOptions, () =>
      this.runtimeContext.getAppPublishOptions()
    );

    this.contextIpcMain.handle(
      ipcMainEvents_info.app_getPluginsPublishOptions,
      () => this.runtimeContext.getAppPluginsPublishOptions()
    );
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererInvokeEvents(
      ipcMainRendererEvents_info.invoke
    );
  }
}

export function resolveAppInfo() {
  return new AppInfoResolver();
}
