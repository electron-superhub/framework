import path from "node:path";
import { pathToFileURL } from "node:url";

import { AppContext, AppModule, AppPackageInfo } from "../../types";
import {
  AppModuleBase,
  DefaultAppRuntimeContext,
  registerIpcMainEvent,
} from "../core";

const ipcMainEvents_package = {
  app_getPackageInfo: "app:get-package-info",
} as const;

type IpcMainEvents_package = typeof ipcMainEvents_package;

declare module "../core" {
  interface DefaultAppRuntimeContext {
    getAppPackageInfo(): AppPackageInfo;
    getAppPackageConfigs(): Record<string, any>;
  }

  interface IpcMainEvents extends IpcMainEvents_package {}
}

const runtimeKeys = {
  app_package: "app:package",
};

const ipcMainRendererEvents_package = {
  invoke: {
    ...ipcMainEvents_package,
  },
};

class AppPackageResolver extends AppModuleBase implements AppModule {
  async init(context: AppContext): Promise<void> {
    super.load(context);

    this.registerToIpcMainEvents();

    const appRootPath: string = this.runtimeContext.getAppRootPath();
    const packageJson = await this.loadAppPackageJson(appRootPath);
    this.setRuntimeAppPackageInfo(packageJson);

    this.extendsRuntimeContext();

    this.handleAppPackageEvents();

    this.registerToIpcRendererEvents();
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_package).forEach(([eventKey, eventName]) => {
      registerIpcMainEvent(eventKey, eventName);
    });
  }

  private async loadAppPackageJson(appRootPath: string) {
    const packageJsonPath = path.join(appRootPath, "package.json");
    const packageJsonFileUrl = pathToFileURL(packageJsonPath);

    const { default: packageJson } = await import(packageJsonFileUrl.href, {
      with: { type: "json" },
    });
    return packageJson;
  }

  private setRuntimeAppPackageInfo(packageJson: any) {
    const packageInfo: AppPackageInfo = {
      name: packageJson.name,
      productName: packageJson.productName ?? packageJson.name,
      description: packageJson.description,
      version: packageJson.version,
      appConfigs: packageJson.appConfigs ?? {},
    };

    this.runtimeContext.setRuntimeInfo(runtimeKeys.app_package, packageInfo);
  }

  private extendsRuntimeContext() {
    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppPackageInfo",
      function (): AppPackageInfo {
        return this.getRuntimeInfo(runtimeKeys.app_package) as AppPackageInfo;
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppPackageConfigs",
      function (): Record<string, any> {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_package, [
          "appConfigs",
        ]);
      }
    );
  }

  private handleAppPackageEvents() {
    this.contextIpcMain.handle(ipcMainEvents_package.app_getPackageInfo, () =>
      this.runtimeContext.getAppPackageInfo()
    );
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererInvokeEvents(
      ipcMainRendererEvents_package.invoke
    );
  }
}

export function resolveAppPackage() {
  return new AppPackageResolver();
}
