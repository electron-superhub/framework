import dotenv from "dotenv";
import path from "node:path";

import { AppContext, AppModule } from "../types";
import { AppModuleBase, DefaultAppRuntimeContext } from "../core";

declare module "../core" {
  interface DefaultAppRuntimeContext {
    getAppRootPath(): string;
    isDevelopment(): boolean;
    isProduction(): boolean;
    isWindowsPlatform(): boolean;
    isLinuxPlatform(): boolean;
    isMacPlatform(): boolean;
    getProcessPlatform(): string;
    isX64Arch(): boolean;
    isArm64Arch(): boolean;
    getProcessArch(): string;
  }
}

const runtimeKeys = {
  app_root: "app:root",
  process_env: "process:env",
};

class ProcessEnvironmentResolver extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.setRuntimeAppRootPath();

    this.checkConfigProdEnvironment();
    this.setRuntimeProcessEnv();

    this.extendsRuntimeContext();
  }

  private setRuntimeAppRootPath() {
    const appRootPath = this.contextApp.getAppPath();

    this.runtimeContext.setRuntimeInfo(runtimeKeys.app_root, {
      path: appRootPath,
    });
  }

  private checkConfigProdEnvironment() {
    if (this.contextApp.isPackaged) {
      dotenv.config({
        path: path.join(this.contextApp.getAppPath(), ".env.production"),
      });
    }
  }

  private setRuntimeProcessEnv() {
    const processEnvInfo = {
      isDev: process.env.NODE_ENV === "development",
      isProd: process.env.NODE_ENV === "production",
      platform: {
        value: process.platform,
        isWindows: process.platform === "win32",
        isLinux: process.platform === "linux",
        isMac: process.platform === "darwin",
      },
      arch: {
        value: process.arch,
        isX64: process.arch === "x64",
        isArm64: process.arch === "arm64",
      },
    };

    this.runtimeContext.setRuntimeInfo(runtimeKeys.process_env, processEnvInfo);
  }

  private extendsRuntimeContext() {
    DefaultAppRuntimeContext.addExtensionMethod(
      "getAppRootPath",
      function (): string {
        return this.getRuntimeInfoSubValue(runtimeKeys.app_root, ["path"]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "isDevelopment",
      function (): boolean {
        return this.getRuntimeInfoSubValue(runtimeKeys.process_env, ["isDev"]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "isProduction",
      function (): boolean {
        return this.getRuntimeInfoSubValue(runtimeKeys.process_env, ["isProd"]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "isWindowsPlatform",
      function (): boolean {
        return this.getRuntimeInfoSubValue(runtimeKeys.process_env, [
          "platform",
          "isWindows",
        ]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "isLinuxPlatform",
      function (): boolean {
        return this.getRuntimeInfoSubValue(runtimeKeys.process_env, [
          "platform",
          "isLinux",
        ]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "isMacPlatform",
      function (): boolean {
        return this.getRuntimeInfoSubValue(runtimeKeys.process_env, [
          "platform",
          "isMac",
        ]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getProcessPlatform",
      function (): string {
        return this.getRuntimeInfoSubValue(runtimeKeys.process_env, [
          "platform",
          "value",
        ]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "isX64Arch",
      function (): boolean {
        return this.getRuntimeInfoSubValue(runtimeKeys.process_env, [
          "arch",
          "isX64",
        ]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "isArm64Arch",
      function (): boolean {
        return this.getRuntimeInfoSubValue(runtimeKeys.process_env, [
          "arch",
          "isArm64",
        ]);
      }
    );

    DefaultAppRuntimeContext.addExtensionMethod(
      "getProcessArch",
      function (): string {
        return this.getRuntimeInfoSubValue(runtimeKeys.process_env, [
          "arch",
          "value",
        ]);
      }
    );
  }
}

export function resolveProcessEnvironment() {
  return new ProcessEnvironmentResolver();
}
