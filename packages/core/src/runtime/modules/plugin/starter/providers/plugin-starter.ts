import path from "node:path";
import fs from "node:fs";

import {
  AppContext,
  AppPluginArgPassModes,
  AppPluginInfo,
  AppPluginMetaInfo,
  AppPluginType,
} from "../../../../../types";
import { AppPluginsBase } from "../../../../core";

export interface AppPluginStarter {
  targetType: AppPluginType;

  startAppPlugin(
    pluginInfo: AppPluginInfo,
    stdMsgListener?: (stdMsg: string) => void
  ): Promise<number>;

  stopAppPlugin(pluginInfoBase: AppPluginMetaInfo): Promise<void>;
}

export abstract class AppPluginStarterBase extends AppPluginsBase {
  protected constructor(context: AppContext) {
    super();
    super.load(context);
  }

  // #region start plugin
  protected resolvePluginBinDirPath(pluginInfo: AppPluginInfo) {
    const pluginInstallDirPath = this.resolvePluginInstallDirPath(pluginInfo);

    const pluginBinDirPath = path.join(
      pluginInstallDirPath,
      pluginInfo.startOptions.binFileDir || "."
    );

    if (!fs.existsSync(pluginBinDirPath)) {
      fs.mkdirSync(pluginBinDirPath, { recursive: true });
    }

    return pluginBinDirPath;
  }

  protected async resolvePluginBinFilePath(pluginInfo: AppPluginInfo) {
    const pluginBinDirPath = this.resolvePluginBinDirPath(pluginInfo);

    const pluginBinFileName = pluginInfo.startOptions.binFileName;
    const pluginBinFilePath = path.join(pluginBinDirPath, pluginBinFileName);

    const pluginBinDirFileNames = await fs.promises.readdir(pluginBinDirPath);
    const matchBinFileFullName = pluginBinDirFileNames.find((fileName) => {
      const fileNameWithoutExt = path.parse(fileName).name;

      return fileNameWithoutExt === pluginBinFileName;
    });

    if (!matchBinFileFullName) {
      throw new Error(`未找到 可执行文件 ${pluginBinFilePath}`);
    }

    return path.join(pluginBinDirPath, matchBinFileFullName);
  }

  protected async resolvePluginListenPort(pluginInfo: AppPluginInfo) {
    const pluginPortEnvValue = process.env[pluginInfo.startOptions.portEnvKey];

    if (pluginPortEnvValue) {
      return Number(pluginPortEnvValue);
    }

    throw new Error(
      `未找到 监听端口 环境变量 ${pluginInfo.startOptions.portEnvKey}`
    );
  }

  protected buildPluginStartCmdArgs(
    pluginInfo: AppPluginInfo,
    pluginListenPort: number
  ) {
    const cmdArgs: string[] = [];

    if ((pluginInfo.startOptions.cmdArgv ?? []).length > 0) {
      cmdArgs.push(...pluginInfo.startOptions.cmdArgv!);
    }

    if (pluginInfo.startOptions.portArgPassMode === AppPluginArgPassModes.Cmd) {
      cmdArgs.push(
        `--${pluginInfo.startOptions.portArgName}=${pluginListenPort}`
      );
    }

    if (pluginInfo.startOptions.cmdPassAppInfo === true) {
      const appPackageInfo = this.runtimeContext.getAppPackageInfo();
      cmdArgs.push(`--app-package=${JSON.stringify(appPackageInfo)}`);

      cmdArgs.push(`--app-data-path=${this.runtimeContext.getAppPathsData()}`);
    }

    return cmdArgs;
  }
  // #endregion

  // #region starter runtime infos
  protected savePluginStartedProcess(
    pluginInfoBase: AppPluginMetaInfo,
    pluginProcess: any,
    pluginListenPort: number
  ) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      this.pluginsRuntimeKey,
      ["processes"],
      {
        [pluginInfoBase.pluginId]: {
          process: pluginProcess,
          listenPort: pluginListenPort,
        },
      }
    );
  }

  protected resolvePluginStartedProcess(pluginInfoBase: AppPluginMetaInfo) {
    const startedProcess = this.runtimeContext.getRuntimeInfoSubValue(
      this.pluginsRuntimeKey,
      ["processes", pluginInfoBase.pluginId]
    );

    return startedProcess?.process;
  }

  protected removePluginStartedProcess(pluginInfoBase: AppPluginMetaInfo) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      this.pluginsRuntimeKey,
      ["processes"],
      {
        [pluginInfoBase.pluginId]: null,
      }
    );
  }
  // #endregion
}
