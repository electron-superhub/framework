import path from "node:path";
import fs from "node:fs";

import { AppContext, AppPluginInfo, AppPluginMetaInfo } from "../../types";
import { AppModuleBase } from "./module";

const runtimeKeys = {
  app_plugins: "app:plugins",
};

export abstract class AppPluginsBase extends AppModuleBase {
  protected pluginsPath!: string;

  private static installsJsonFlushPromise: Promise<void>;

  protected load(context: AppContext) {
    super.load(context);

    this.pluginsPath = this.resolvePluginsPath();
  }

  protected get pluginsRuntimeKey() {
    return runtimeKeys.app_plugins;
  }

  // #region plugin paths
  protected resolvePluginsPath() {
    const appDataPath = this.runtimeContext.getAppPathsData();
    const appPluginsPath = path.join(appDataPath, "plugins");

    if (!fs.existsSync(appPluginsPath)) {
      fs.mkdirSync(appPluginsPath, { recursive: true });
    }

    return appPluginsPath;
  }

  protected resolvePluginInstallDirPath(pluginInfoBase: AppPluginMetaInfo) {
    const pluginInstallDirPath = path.join(
      this.pluginsPath,
      pluginInfoBase.pluginId
    );

    if (!fs.existsSync(pluginInstallDirPath)) {
      fs.mkdirSync(pluginInstallDirPath, { recursive: true });
    }

    return pluginInstallDirPath;
  }
  // #endregion

  // #region installed plugin infos
  protected async initSetInstalledPluginInfos() {
    const installedPluginInfos = await this.readInstalledPluginInfosFromFile();

    this.saveInstalledPluginInfos(installedPluginInfos);

    AppPluginsBase.installsJsonFlushPromise = Promise.resolve();
  }

  // 从 installs.json中读取 已安装插件列表
  private async readInstalledPluginInfosFromFile(): Promise<AppPluginInfo[]> {
    const installsJsonPath = path.join(this.pluginsPath, "installs.json");

    if (!fs.existsSync(installsJsonPath)) {
      await fs.promises.writeFile(installsJsonPath, "[]", "utf8");
      return [];
    }

    const installsJsonStr = await fs.promises.readFile(
      installsJsonPath,
      "utf8"
    );
    const installPluginInfos = JSON.parse(installsJsonStr) as AppPluginInfo[];
    return installPluginInfos ?? [];
  }

  // 初始保存 已安装插件列表 到 runtimeInfo
  private saveInstalledPluginInfos(installedPluginInfos: AppPluginInfo[]) {
    this.runtimeContext.updateRuntimeInfo(runtimeKeys.app_plugins, {
      installed: Object.fromEntries(
        installedPluginInfos.map((pluginInfo) => [
          pluginInfo.pluginId,
          pluginInfo,
        ])
      ),
    });
  }

  protected getInstalledPluginInfos() {
    const installedPluginInfoMap: Record<string, AppPluginInfo> =
      this.runtimeContext.getRuntimeInfoSubValue(runtimeKeys.app_plugins, [
        "installed",
      ]);

    return Object.values(installedPluginInfoMap);
  }

  protected getInstalledPluginInfo(pluginInfoBase: AppPluginMetaInfo) {
    return this.runtimeContext.getRuntimeInfoSubValue(runtimeKeys.app_plugins, [
      "installed",
      pluginInfoBase.pluginId,
    ]) as AppPluginInfo;
  }

  // 读取 对应插件的plugin.json 并更新 runtimeInfo的 已安装插件信息
  protected async setInstalledPluginInfoFromFile(
    pluginInfoBase: AppPluginMetaInfo
  ) {
    const installedPluginInfo = await this.readInstalledPluginInfoFromFile(
      pluginInfoBase
    );

    this.setInstalledPluginInfo(installedPluginInfo);

    // 加入队列, flush已安装插件列表 保存到 installs.json
    AppPluginsBase.installsJsonFlushPromise =
      AppPluginsBase.installsJsonFlushPromise
        .then(() => this.writeInstalledPluginInfosToFile())
        .catch(() => {}); // 忽略 文件写入错误
  }

  // 从对应插件的 plugin.json 中读取插件信息
  private async readInstalledPluginInfoFromFile(
    pluginInfoBase: AppPluginMetaInfo
  ) {
    const pluginInstallDirPath =
      this.resolvePluginInstallDirPath(pluginInfoBase);
    const pluginJsonPath = path.join(pluginInstallDirPath, "plugin.json");

    const pluginJsonStr = await fs.promises.readFile(pluginJsonPath, "utf8");
    return JSON.parse(pluginJsonStr) as AppPluginInfo;
  }

  private setInstalledPluginInfo(pluginInfo: AppPluginInfo) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      runtimeKeys.app_plugins,
      ["installed"],
      {
        [pluginInfo.pluginId]: pluginInfo,
      }
    );
  }

  // 将 runtimeInfo的 已安装插件列表 写入到 installs.json
  private async writeInstalledPluginInfosToFile() {
    const installedPluginInfos = this.getInstalledPluginInfos();

    const installsJsonPath = path.join(this.pluginsPath, "installs.json");

    await fs.promises.writeFile(
      installsJsonPath,
      JSON.stringify(installedPluginInfos, null, 2),
      "utf8"
    );
  }
  // #endregion
}
