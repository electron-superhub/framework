import envPaths from "env-paths";

import { AppContext, AppModule } from "../types";
import { AppModuleBase, DefaultAppRuntimeContext } from "../core";

declare module "../core" {
  interface DefaultAppRuntimeContext {
    getAppPathsData(): string;
    getAppPathsConfig(): string;
    getAppPathsCache(): string;
    getAppPathsLog(): string;
    getAppPathsTemp(): string;
  }
}

const runtimeKeys = {
  app_paths: "app:paths",
};

class AppPathsResolver extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    const appPaths = this.resolveAppPaths();
    this.setRuntimeAppPathsInfo({ ...appPaths });

    this.extendsRuntimeContext();
  }

  private resolveAppPaths() {
    const packageInfo = this.runtimeContext.getAppPackageInfo();

    return envPaths(packageInfo.name, { suffix: "" });
  }

  private setRuntimeAppPathsInfo(appPathsInfo: Record<string, string>) {
    this.runtimeContext.setRuntimeInfo(runtimeKeys.app_paths, appPathsInfo);
  }

  private extendsRuntimeContext() {
    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppPathsData",
      function (): string {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_paths, ["data"]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppPathsConfig",
      function (): string {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_paths, ["config"]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppPathsCache",
      function (): string {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_paths, ["cache"]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppPathsLog",
      function (): string {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_paths, ["log"]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppPathsTemp",
      function (): string {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_paths, ["temp"]);
      }
    );
  }
}

export function resolveAppPaths() {
  return new AppPathsResolver();
}
