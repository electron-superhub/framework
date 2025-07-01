import { to } from "await-to-js";
import { v4 as uuidv4 } from "uuid";
import { extractAll } from "@electron/asar";

import path from "node:path";
import fs from "original-fs";

import {
  AppContext,
  AppModule,
  AppPluginDownloadedInfo,
  AppPluginInfoBase,
  AppPluginProgressInfo,
  AppPluginPublishInfo,
} from "../../types";
import {
  AppPluginsBase,
  ipcMainEvents,
  registerIpcMainEvent,
} from "../../core";
import {
  checkVersionNeedToUpdate,
  httpDownloadFile,
  httpGetStreamToJson,
} from "../../utils";

const ipcMainEvents_pluginsUpdater = {
  app_plugins_checkUpdate: "app:plugins:check-update",
  app_plugins_downloadUpdate: "app:plugins:download-update",
  app_plugins_installUpdate: "app:plugins:install-update",
} as const;

type IpcMainEvents_pluginsUpdater = typeof ipcMainEvents_pluginsUpdater;

declare module "../../core" {
  interface IpcMainEvents extends IpcMainEvents_pluginsUpdater {}
}

const ipcMainRendererEvents_pluginsUpdater = {
  on: {
    pluginsUpdater_checkingUpdate:
      "renderer:on:plugins-updater:checking-update",
    pluginsUpdater_updateAvailable:
      "renderer:on:plugins-updater:update-available",
    pluginsUpdater_updateNotAvailable:
      "renderer:on:plugins-updater:update-not-available",
    pluginsUpdater_error: "renderer:on:plugins-updater:error",
    pluginsUpdater_downloadProgress:
      "renderer:on:plugins-updater:download-progress",
    pluginsUpdater_updateDownloaded:
      "renderer:on:plugins-updater:update-downloaded",
    pluginsUpdater_updateInstalled:
      "renderer:on:plugins-updater:update-installed",
  },
  send: {
    ...ipcMainEvents_pluginsUpdater,
  },
};

const runtimeKeys = {
  app_plugins_updater: "app:plugins:updater",
};

class AppPluginsUpdater extends AppPluginsBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.registerToIpcMainEvents();

    this.listenAppPluginsUpdateEvents();

    this.registerToIpcRendererEvents();
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_pluginsUpdater).forEach(
      ([eventKey, eventName]) => {
        registerIpcMainEvent(eventKey, eventName);
      }
    );
  }

  private listenAppPluginsUpdateEvents() {
    this.contextIpcMain.on(
      ipcMainEvents_pluginsUpdater.app_plugins_checkUpdate,
      () => {
        this.pluginsCheckUpdate();
      }
    );

    this.contextIpcMain.on(
      ipcMainEvents_pluginsUpdater.app_plugins_downloadUpdate,
      (event, pluginPublishInfo) => {
        this.pluginsDownloadUpdate(pluginPublishInfo);
      }
    );

    this.contextIpcMain.on(
      ipcMainEvents_pluginsUpdater.app_plugins_installUpdate,
      (event, pluginPublishInfo) => {
        this.pluginsInstallUpdate(pluginPublishInfo);
      }
    );
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererOnEvents(
      ipcMainRendererEvents_pluginsUpdater.on
    );

    this.runtimeContext.registerIpcRendererSendEvents(
      ipcMainRendererEvents_pluginsUpdater.send
    );
  }

  // #region check update
  private pluginsCheckUpdate() {
    this.emitPluginsUpdaterCheckingUpdate();

    const latestPublishFileUrl = this.resolvePluginsLatestPublishFileUrl();
    if (!latestPublishFileUrl) {
      this.emitPluginsUpdaterError("未获取到插件最新发布信息Url地址");
      return;
    }

    this.resolvePluginsToUpdatePublishInfos(latestPublishFileUrl)
      .then((toUpdatePluginPublishInfos) => {
        if (toUpdatePluginPublishInfos?.length > 0) {
          // 通知 renderer 需要更新的插件发布信息
          this.emitPluginsUpdaterUpdateAvailable(toUpdatePluginPublishInfos);
        } else {
          // 通知 renderer 没有需要更新的插件
          this.emitPluginsUpdaterUpdateNotAvailable();
        }
      })
      .catch((error) => this.emitPluginsUpdaterError(error?.message));
  }

  private async resolvePluginsToUpdatePublishInfos(latestPublishFileUrl: URL) {
    const [err, latestPluginPublishInfos] = await to(
      this.httpGetPluginsLatestPublishInfos(latestPublishFileUrl)
    );
    if (err) {
      throw new Error(`获取插件最新发布信息失败, ${err.message}`);
    }

    const installedPluginInfos = this.getInstalledPluginInfos();

    return latestPluginPublishInfos.filter((pluginPublishInfo) => {
      const matchInstalledPluginInfo = installedPluginInfos.find(
        (installedPluginInfo) =>
          installedPluginInfo.pluginId === pluginPublishInfo.pluginId
      );

      if (!matchInstalledPluginInfo) return true; // 未安装的插件 需要下载安装

      // 已安装的插件 版本号低于 最新版本, 需要下载更新
      return checkVersionNeedToUpdate(
        matchInstalledPluginInfo.version,
        pluginPublishInfo.version
      );
    });
  }

  private async httpGetPluginsLatestPublishInfos(latestPublishFileUrl: URL) {
    const latestPublishInfos = await httpGetStreamToJson<
      AppPluginPublishInfo[]
    >(latestPublishFileUrl.href);

    return latestPublishInfos ?? [];
  }

  private resolvePluginsLatestPublishFileUrl() {
    const pluginsPublishBaseUrl = this.resolvePluginsPublishBaseUrl();

    if (!pluginsPublishBaseUrl) return null;

    return new URL(this.resolveLatestPublishFileName(), pluginsPublishBaseUrl);
  }

  private resolveLatestPublishFileName() {
    return `latest${this.resolvePublishFilePlatformSuffix()}${this.resolvePublishFileArchSuffix()}.json`;
  }

  private resolvePublishFilePlatformSuffix() {
    if (this.runtimeContext.isWindowsPlatform()) {
      return "";
    } else if (this.runtimeContext.isMacPlatform()) {
      return "-mac";
    } else if (this.runtimeContext.isLinuxPlatform()) {
      return "-linux";
    } else {
      return `-${this.runtimeContext.getProcessPlatform()}`;
    }
  }

  private resolvePublishFileArchSuffix() {
    if (this.runtimeContext.isX64Arch()) {
      return "";
    } else if (this.runtimeContext.isArm64Arch()) {
      return "-arm64";
    } else {
      return `-${this.runtimeContext.getProcessArch()}`;
    }
  }
  // #endregion

  // #region download update
  private pluginsDownloadUpdate(pluginPublishInfo: AppPluginPublishInfo) {
    const installedPluginInfo = this.getInstalledPluginInfo(pluginPublishInfo);
    if (
      installedPluginInfo &&
      !checkVersionNeedToUpdate(
        installedPluginInfo.version,
        pluginPublishInfo.version
      )
    ) {
      this.emitPluginsUpdaterError(
        `插件 ${pluginPublishInfo.productName} 本地已安装版本 不低于 更新版本 ${pluginPublishInfo.version}, 无需下载更新`
      );
      return;
    }

    const pluginDownloadedInfo =
      this.getPluginDownloadedInfo(pluginPublishInfo);
    if (pluginDownloadedInfo) {
      this.emitPluginsUpdaterError(
        `插件 ${pluginPublishInfo.productName} ${pluginPublishInfo.version} 安装包已下载, 无需重复下载, 请执行安装更新`
      );
      return;
    }

    this.downloadPluginReleaseFile(pluginPublishInfo);
  }

  private downloadPluginReleaseFile(pluginPublishInfo: AppPluginPublishInfo) {
    const pluginReleaseFileUrl =
      this.resolvePluginReleaseFileUrl(pluginPublishInfo);
    if (!pluginReleaseFileUrl) {
      this.emitPluginsUpdaterError(
        `获取插件 ${pluginPublishInfo.productName} ${pluginPublishInfo.version} 安装包下载地址失败`
      );
      return;
    }

    // 获取 Release文件 下载保存路径
    const pluginReleaseDownloadFilePath =
      this.resolvePluginReleaseDownloadFilePath(
        pluginPublishInfo,
        pluginReleaseFileUrl
      );

    httpDownloadFile(
      pluginReleaseFileUrl.href,
      pluginReleaseDownloadFilePath,
      pluginPublishInfo.sha512,
      (progress) => {
        this.emitPluginsUpdaterDownloadProgress({
          ...pluginPublishInfo,
          progress: {
            percent: Number((progress.percent * 100).toFixed(2)),
            transferred: progress.transferred,
            total: progress.total,
          },
        });
      }
    )
      .then(() => {
        const pluginDownloadedInfo: AppPluginDownloadedInfo = {
          ...pluginPublishInfo,
          downloadedFilePath: pluginReleaseDownloadFilePath,
        };

        this.savePluginDownloadedInfo(pluginDownloadedInfo);

        this.emitPluginsUpdaterUpdateDownloaded(pluginDownloadedInfo);
      })
      .catch((error) =>
        this.emitPluginsUpdaterError(
          `插件 ${pluginPublishInfo.productName} ${pluginPublishInfo.version} 安装包下载失败, ${error?.message}`
        )
      );
  }

  private resolvePluginReleaseFileUrl(pluginPublishInfo: AppPluginPublishInfo) {
    const pluginsPublishBaseUrl = this.resolvePluginsPublishBaseUrl();

    if (!pluginsPublishBaseUrl) return null;

    return new URL(pluginPublishInfo.url, pluginsPublishBaseUrl);
  }

  private resolvePluginReleaseDownloadFilePath(
    pluginPublishInfo: AppPluginPublishInfo,
    pluginReleaseFileUrl: URL
  ) {
    const pluginReleaseDownloadDirPath =
      this.resolvePluginReleaseDownloadDirPath(pluginPublishInfo);

    // 使用 path.extname 提取url中 文件扩展名
    const pluginReleaseFileExt =
      path.extname(pluginReleaseFileUrl.pathname) || ".asar";
    const pluginReleaseDownloadFileName =
      uuidv4().replace(/-/g, "") + pluginReleaseFileExt;

    return path.join(
      pluginReleaseDownloadDirPath,
      pluginReleaseDownloadFileName
    );
  }

  private resolvePluginReleaseDownloadDirPath(
    pluginInfoBase: AppPluginInfoBase
  ) {
    const pluginReleaseDownloadDirPath = path.join(
      this.pluginsPath,
      "updater",
      pluginInfoBase.pluginId
    );

    if (!fs.existsSync(pluginReleaseDownloadDirPath)) {
      fs.mkdirSync(pluginReleaseDownloadDirPath, { recursive: true });
    }

    return pluginReleaseDownloadDirPath;
  }
  // #endregion

  // #region install update
  private pluginsInstallUpdate(pluginPublishInfo: AppPluginPublishInfo) {
    const pluginDownloadedInfo =
      this.getPluginDownloadedInfo(pluginPublishInfo);
    if (!pluginDownloadedInfo) {
      this.emitPluginsUpdaterError(
        `插件 ${pluginPublishInfo.productName} ${pluginPublishInfo.version} 安装包未下载, 无法安装更新`
      );
      return;
    }

    this.installPluginReleaseFile(pluginDownloadedInfo)
      .then(() => {
        this.removePluginDownloadedInfo(pluginDownloadedInfo);
        this.deletePluginDownloadReleaseFile(pluginDownloadedInfo);

        this.emitPluginsUpdaterUpdateInstalled(pluginDownloadedInfo);

        // 更新 runtimeInfo中 已安装插件列表
        return this.setInstalledPluginInfoFromFile(pluginDownloadedInfo);
      })
      .then(() => {
        // 安装更新结束后 启动插件
        this.contextIpcMain.emit(
          ipcMainEvents.app_plugins_startPlugin,
          null,
          pluginDownloadedInfo
        );
      })
      .catch((error) =>
        this.emitPluginsUpdaterError(
          `插件 ${pluginDownloadedInfo.productName} ${pluginDownloadedInfo.version} 安装失败, ${error?.message}, 请重试安装`
        )
      );
  }

  private async installPluginReleaseFile(
    pluginDownloadedInfo: AppPluginDownloadedInfo
  ) {
    const [err] = await to(
      this.checkWaitStopInstalledPlugin(pluginDownloadedInfo)
    );
    if (err) {
      throw err;
    }

    const [err1] = await to(this.emptyPluginInstallDir(pluginDownloadedInfo));
    if (err1) {
      throw new Error(`清空插件安装目录失败: ${err1.message}`);
    }

    const [err2] = await to(
      this.extractPluginReleaseFileToInstallDir(pluginDownloadedInfo)
    );
    if (err2) {
      throw new Error(`解压插件安装包失败: ${err2.message}`);
    }
  }

  private checkWaitStopInstalledPlugin(pluginInfoBase: AppPluginInfoBase) {
    const installedPluginInfo = this.getInstalledPluginInfo(pluginInfoBase);

    if (!installedPluginInfo) return Promise.resolve();

    // 创建一个临时的 接收插件停止结果的事件
    const pluginStopResultEvent = `${
      ipcMainEvents.app_plugins_stopPlugin
    }-result-${uuidv4().replace(/-/g, "")}`;

    return new Promise<void>((resolve, reject) => {
      this.contextIpcMain.once(pluginStopResultEvent, (event, result) => {
        if (result.stopped) {
          resolve();
        } else {
          reject(result.error);
        }
      });

      this.contextIpcMain.emit(
        ipcMainEvents.app_plugins_stopPlugin,
        null,
        installedPluginInfo,
        {
          event: pluginStopResultEvent,
        }
      );
    });
  }

  private async emptyPluginInstallDir(pluginInfoBase: AppPluginInfoBase) {
    const pluginInstallDirPath =
      this.resolvePluginInstallDirPath(pluginInfoBase);

    // 先删除安装目录 后重新创建
    await fs.promises.rm(pluginInstallDirPath, {
      recursive: true,
      force: true,
    });
    await fs.promises.mkdir(pluginInstallDirPath, { recursive: true });
  }

  private async extractPluginReleaseFileToInstallDir(
    pluginDownloadedInfo: AppPluginDownloadedInfo
  ) {
    const pluginInstallDirPath =
      this.resolvePluginInstallDirPath(pluginDownloadedInfo);

    extractAll(pluginDownloadedInfo.downloadedFilePath, pluginInstallDirPath);
  }

  private deletePluginDownloadReleaseFile(
    pluginDownloadedInfo: AppPluginDownloadedInfo
  ) {
    fs.promises
      .rm(pluginDownloadedInfo.downloadedFilePath, {
        force: true,
      })
      .catch(() => {}); // 忽略 文件删除错误
  }
  // #endregion

  // #region read configs
  private resolvePluginsPublishBaseUrl(): string {
    return (
      this.runtimeContext.getAppPackageConfigs().plugins_publish_base_url ?? ""
    );
  }
  // #endregion

  // #region emit renderer events
  private emitPluginsUpdaterCheckingUpdate() {
    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsUpdater.on.pluginsUpdater_checkingUpdate
    );
  }

  private emitPluginsUpdaterError(errorMsg: string) {
    const pluginsUpdaterError = new Error(`插件更新: ${errorMsg}`);

    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsUpdater.on.pluginsUpdater_error,
      null,
      pluginsUpdaterError
    );
  }

  private emitPluginsUpdaterUpdateAvailable(
    toUpdatePluginPublishInfos: AppPluginPublishInfo[]
  ) {
    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsUpdater.on.pluginsUpdater_updateAvailable,
      null,
      toUpdatePluginPublishInfos
    );
  }

  private emitPluginsUpdaterUpdateNotAvailable() {
    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsUpdater.on.pluginsUpdater_updateNotAvailable
    );
  }

  private emitPluginsUpdaterDownloadProgress(
    pluginReleaseDownloadProgress: AppPluginProgressInfo
  ) {
    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsUpdater.on.pluginsUpdater_downloadProgress,
      null,
      pluginReleaseDownloadProgress
    );
  }

  private emitPluginsUpdaterUpdateDownloaded(
    pluginDownloadedInfo: AppPluginDownloadedInfo
  ) {
    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsUpdater.on.pluginsUpdater_updateDownloaded,
      null,
      pluginDownloadedInfo
    );
  }

  private emitPluginsUpdaterUpdateInstalled(
    pluginPublishInfo: AppPluginPublishInfo
  ) {
    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsUpdater.on.pluginsUpdater_updateInstalled,
      null,
      pluginPublishInfo
    );
  }
  // #endregion

  // #region updater runtime infos
  private savePluginDownloadedInfo(
    pluginDownloadedInfo: AppPluginDownloadedInfo
  ) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      runtimeKeys.app_plugins_updater,
      ["downloaded", pluginDownloadedInfo.pluginId],
      {
        [pluginDownloadedInfo.version]: pluginDownloadedInfo,
      }
    );
  }

  private getPluginDownloadedInfo(
    pluginInfoBase: AppPluginInfoBase
  ): AppPluginDownloadedInfo {
    return this.runtimeContext.getRuntimeInfoSubValue(
      runtimeKeys.app_plugins_updater,
      ["downloaded", pluginInfoBase.pluginId, pluginInfoBase.version]
    ) as AppPluginDownloadedInfo;
  }

  private removePluginDownloadedInfo(pluginInfoBase: AppPluginInfoBase) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      runtimeKeys.app_plugins_updater,
      ["downloaded", pluginInfoBase.pluginId],
      {
        [pluginInfoBase.version]: null,
      }
    );
  }
  // #endregion
}

export function handlePluginsUpdater() {
  return new AppPluginsUpdater();
}
