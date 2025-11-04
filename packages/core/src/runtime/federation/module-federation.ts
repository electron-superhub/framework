import got from "got";
import { v4 as uuidv4 } from "uuid";
import { extractAll } from "@electron/asar";

import path from "node:path";
import fs from "original-fs";

import {
  AppContext,
  AppModuleFederationManifest,
  AppRemoteModuleInfo,
  AppRemoteModuleMetaInfo,
} from "../../types";
import { AppModuleBase } from "../core";
import { httpDownloadFile } from "../utils";

const runtimeKeys = {
  app_moduleFederation: "app:module-federation",
};

type AppModuleInfoMap_Versions = Record<
  string,
  Record<string, AppRemoteModuleInfo>
>;

export class ModuleFederationLoader extends AppModuleBase {
  protected readonly modulesPath: string;

  protected static installsJsonFlushPromise: Promise<void>;
  protected static attachesJsonFlushPromise: Promise<void>;

  constructor(context: AppContext) {
    super();
    super.load(context);

    this.modulesPath = this.resolveModulesPath();
  }

  // #region module paths
  protected resolveModulesPath() {
    const appDataPath = this.runtimeContext.getAppPathsData();
    const appModulesPath = path.join(appDataPath, "modules");

    if (!fs.existsSync(appModulesPath)) {
      fs.mkdirSync(appModulesPath, { recursive: true });
    }

    return appModulesPath;
  }

  protected resolveModuleInstallDirPath(
    moduleInfoBase: AppRemoteModuleMetaInfo
  ) {
    const moduleInstallDirPath = path.join(
      this.modulesPath,
      moduleInfoBase.moduleId
    );

    if (!fs.existsSync(moduleInstallDirPath)) {
      fs.mkdirSync(moduleInstallDirPath, { recursive: true });
    }

    return moduleInstallDirPath;
  }

  protected resolveModuleInstallExtractDirPath(
    moduleInfoBase: AppRemoteModuleMetaInfo
  ) {
    const moduleInstallDirPath =
      this.resolveModuleInstallDirPath(moduleInfoBase);

    const safeModuleName = moduleInfoBase.uniqueName.replace(
      /[^a-zA-Z0-9_.-]/g,
      "_"
    );
    const shortIntegrity = moduleInfoBase.integrity.slice(7, 15);
    const versionTag = (moduleInfoBase.version || "v0").replace(
      /[^\w.-]/g,
      "_"
    );
    const formatExtractDirName = `${safeModuleName}@${versionTag}-${shortIntegrity}`;

    const moduleInstallExtractDirPath = path.join(
      moduleInstallDirPath,
      formatExtractDirName
    );

    if (!fs.existsSync(moduleInstallExtractDirPath)) {
      fs.mkdirSync(moduleInstallExtractDirPath, { recursive: true });
    }

    return moduleInstallExtractDirPath;
  }

  protected resolveModuleReleaseDownloadDirPath(
    moduleInfoBase: AppRemoteModuleMetaInfo
  ) {
    const moduleDownloadDirPath = path.join(
      this.modulesPath,
      "downloads",
      moduleInfoBase.moduleId
    );

    if (!fs.existsSync(moduleDownloadDirPath)) {
      fs.mkdirSync(moduleDownloadDirPath, { recursive: true });
    }

    return moduleDownloadDirPath;
  }

  protected resolveModuleReleaseDownloadFilePath(
    moduleInfoBase: AppRemoteModuleMetaInfo,
    moduleReleaseFileUrl: URL
  ) {
    const moduleReleaseDownloadDirPath =
      this.resolveModuleReleaseDownloadDirPath(moduleInfoBase);

    // 使用 path.extname 提取url中 文件扩展名
    const moduleReleaseFileExt =
      path.extname(moduleReleaseFileUrl.pathname) || ".asar";
    const moduleReleaseDownloadFileName =
      uuidv4().replace(/-/g, "") + moduleReleaseFileExt;

    return path.join(
      moduleReleaseDownloadDirPath,
      moduleReleaseDownloadFileName
    );
  }
  // #endregion

  // #region local manifest infos
  protected async initSetLocalManifestInfo() {
    const localManifestInfo = await this.readLocalManifestInfoFromFile();

    this.saveLocalManifestInfo(localManifestInfo);

    const localManifestRefreshInfo =
      await this.readLocalManifestRefreshInfoFromFile();

    this.saveLocalManifestRefreshInfo(
      new Date(localManifestRefreshInfo.refreshedAt as string),
      localManifestRefreshInfo
    );
  }

  // 从 manifest.json 中读取本地缓存的 manifest 信息
  protected async readLocalManifestInfoFromFile() {
    const localManifestJsonPath = path.join(this.modulesPath, "manifest.json");

    if (fs.existsSync(localManifestJsonPath)) {
      const manifestJsonStr = await fs.promises.readFile(
        localManifestJsonPath,
        "utf8"
      );
      return JSON.parse(manifestJsonStr) as AppModuleFederationManifest;
    }

    return <AppModuleFederationManifest>{
      schemaVersion: "0.0.0",
      publishedAt: new Date(0).toISOString(),
      modules: {},
    };
  }

  // 从 manifest.refresh.json 中读取本地缓存的 manifest 刷新信息
  protected async readLocalManifestRefreshInfoFromFile() {
    const localManifestRefreshJsonPath = path.join(
      this.modulesPath,
      "manifest.refresh.json"
    );

    if (fs.existsSync(localManifestRefreshJsonPath)) {
      const manifestRefreshJsonStr = await fs.promises.readFile(
        localManifestRefreshJsonPath,
        "utf8"
      );
      return JSON.parse(manifestRefreshJsonStr) as Record<string, any>;
    }

    return { refreshedAt: new Date(0).toISOString() };
  }

  protected saveLocalManifestInfo(manifest: AppModuleFederationManifest) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      runtimeKeys.app_moduleFederation,
      ["manifest"],
      {
        version: manifest.schemaVersion,
        publishedAt: new Date(manifest.publishedAt),
        modules: manifest.modules,
      }
    );
  }

  protected saveLocalManifestRefreshInfo(
    refreshedAt: Date,
    refreshInfo: Record<string, any>
  ) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      runtimeKeys.app_moduleFederation,
      ["manifest"],
      {
        lastRefresh: {
          ...(refreshInfo ?? {}),
          refreshedAt,
        },
      }
    );
  }

  // 更新 本地缓存 manifest 刷新时间
  protected setLocalManifestRefreshDate(refreshedAt: Date) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      runtimeKeys.app_moduleFederation,
      ["manifest", "lastRefresh"],
      { refreshedAt }
    );
  }

  protected getLocalManifestLastRefreshInfo(): Record<string, any> {
    return (
      this.runtimeContext.getRuntimeInfoSubValue(
        runtimeKeys.app_moduleFederation,
        ["manifest", "lastRefresh"]
      ) ?? { refreshedAt: new Date(0) }
    );
  }

  protected async writeLocalManifestInfoToFile(
    manifest: AppModuleFederationManifest
  ) {
    const localManifestJsonPath = path.join(this.modulesPath, "manifest.json");

    await fs.promises.writeFile(
      localManifestJsonPath,
      JSON.stringify(manifest, null, 2),
      "utf8"
    );
  }

  protected async writeLocalManifestRefreshInfoToFile(
    refreshedAt: Date,
    refreshInfo: Record<string, any>
  ) {
    const localManifestRefreshJsonPath = path.join(
      this.modulesPath,
      "manifest.refresh.json"
    );

    const lastRefreshInfo = {
      ...(refreshInfo ?? {}),
      refreshedAt: refreshedAt.toISOString(),
    };

    await fs.promises.writeFile(
      localManifestRefreshJsonPath,
      JSON.stringify(lastRefreshInfo, null, 2),
      "utf8"
    );
  }
  // #endregion

  // #region installed module infos
  protected async initSetInstalledModuleInfos() {
    const installedModuleInfos = await this.readInstalledModuleInfosFromFile();

    this.saveInstalledModuleInfos(installedModuleInfos);

    ModuleFederationLoader.installsJsonFlushPromise = Promise.resolve();
  }

  // 从 installs.json 中读取已安装模块列表
  protected async readInstalledModuleInfosFromFile() {
    const installsJsonPath = path.join(this.modulesPath, "installs.json");

    if (fs.existsSync(installsJsonPath)) {
      const installsJsonStr = await fs.promises.readFile(
        installsJsonPath,
        "utf8"
      );
      return JSON.parse(installsJsonStr) as AppModuleInfoMap_Versions;
    }

    await fs.promises.writeFile(installsJsonPath, "{}", "utf8");
    return {};
  }

  protected saveInstalledModuleInfos(
    installedModuleInfoMap: AppModuleInfoMap_Versions
  ) {
    this.runtimeContext.updateRuntimeInfo(runtimeKeys.app_moduleFederation, {
      installed: installedModuleInfoMap,
    });
  }

  // 读取 对应模块的 module.json 并更新 runtimeInfo的 已安装模块信息
  protected async setInstalledModuleInfoFromFile(
    moduleInfoBase: AppRemoteModuleMetaInfo
  ) {
    const installedModuleInfo = await this.readInstalledModuleInfoFromFile(
      moduleInfoBase
    );

    this.setInstalledModuleInfo(installedModuleInfo);

    // 加入队列, flush已安装模块Map 保存到 installs.json
    ModuleFederationLoader.installsJsonFlushPromise =
      ModuleFederationLoader.installsJsonFlushPromise
        .then(() => this.writeInstalledModuleInfosToFile())
        .catch(() => {}); // 忽略 文件写入错误
  }

  // 从对应模块的 module.json 中读取模块信息
  protected async readInstalledModuleInfoFromFile(
    moduleInfoBase: AppRemoteModuleMetaInfo
  ) {
    const moduleInstallExtractDirPath =
      this.resolveModuleInstallExtractDirPath(moduleInfoBase);
    const moduleJsonPath = path.join(
      moduleInstallExtractDirPath,
      "module.json"
    );

    const moduleJsonStr = await fs.promises.readFile(moduleJsonPath, "utf8");
    return JSON.parse(moduleJsonStr) as AppRemoteModuleInfo;
  }

  protected setInstalledModuleInfo(moduleInfo: AppRemoteModuleInfo) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      runtimeKeys.app_moduleFederation,
      ["installed", moduleInfo.moduleId],
      {
        [moduleInfo.version]: moduleInfo,
      }
    );
  }

  protected async writeInstalledModuleInfosToFile() {
    const installedModuleInfoMap = this.getInstalledModuleInfos();

    const installsJsonPath = path.join(this.modulesPath, "installs.json");

    await fs.promises.writeFile(
      installsJsonPath,
      JSON.stringify(installedModuleInfoMap, null, 2),
      "utf8"
    );
  }

  protected getInstalledModuleInfos() {
    return this.runtimeContext.getRuntimeInfoSubValue(
      runtimeKeys.app_moduleFederation,
      ["installed"]
    ) as AppModuleInfoMap_Versions;
  }
  // #endregion

  // #region attached module infos
  protected async initSetAttachedModuleInfos() {
    const attachedModuleInfos = await this.readAttachedModuleInfosFromFile();

    this.saveAttachedModuleInfos(attachedModuleInfos);

    ModuleFederationLoader.attachesJsonFlushPromise = Promise.resolve();
  }

  protected async readAttachedModuleInfosFromFile() {
    const attachesJsonPath = path.join(this.modulesPath, "attaches.json");

    if (fs.existsSync(attachesJsonPath)) {
      const attachesJsonStr = await fs.promises.readFile(
        attachesJsonPath,
        "utf8"
      );
      return JSON.parse(attachesJsonStr) as Record<string, AppRemoteModuleInfo>;
    }

    await fs.promises.writeFile(attachesJsonPath, "{}", "utf8");
    return {};
  }

  protected saveAttachedModuleInfos(
    attachedModuleInfos: Record<string, AppRemoteModuleInfo>
  ) {
    this.runtimeContext.updateRuntimeInfo(runtimeKeys.app_moduleFederation, {
      attached: attachedModuleInfos,
    });
  }

  // 读取 对应模块的 module.json 并更新 runtimeInfo的 已装载模块信息
  protected async setAttachedModuleInfoFromFile(
    moduleInfoBase: AppRemoteModuleMetaInfo
  ) {
    const attachedModuleInfo = await this.readInstalledModuleInfoFromFile(
      moduleInfoBase
    );

    this.setAttachedModuleInfo(attachedModuleInfo);

    // 加入队列, flush已装载模块列表 保存到 attaches.json
    ModuleFederationLoader.attachesJsonFlushPromise =
      ModuleFederationLoader.attachesJsonFlushPromise
        .then(() => this.writeAttachedModuleInfosToFile())
        .catch(() => {}); // 忽略 文件写入错误
  }

  protected setAttachedModuleInfo(moduleInfo: AppRemoteModuleInfo) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      runtimeKeys.app_moduleFederation,
      ["attached"],
      {
        [moduleInfo.moduleId]: moduleInfo,
      }
    );
  }

  protected async writeAttachedModuleInfosToFile() {
    const attachedModuleInfos = this.getAttachedModuleInfos();

    const attachesJsonPath = path.join(this.modulesPath, "attaches.json");

    await fs.promises.writeFile(
      attachesJsonPath,
      JSON.stringify(attachedModuleInfos, null, 2),
      "utf8"
    );
  }

  protected getAttachedModuleInfos() {
    return this.runtimeContext.getRuntimeInfoSubValue(
      runtimeKeys.app_moduleFederation,
      ["attached"]
    ) as Record<string, AppRemoteModuleInfo>;
  }

  protected getAttachedListenModuleInfos(channel: string) {
    const attachedModuleInfoMap = this.getAttachedModuleInfos();

    return Object.values(attachedModuleInfoMap).filter(
      (moduleInfo) => moduleInfo.ipc.channels[channel]?.action === "listen"
    );
  }

  protected getAttachedHandleModuleInfo(channel: string) {
    const attachedModuleInfoMap = this.getAttachedModuleInfos();

    return Object.values(attachedModuleInfoMap).find(
      (moduleInfo) => moduleInfo.ipc.channels[channel]?.action === "handle"
    );
  }
  // #endregion

  // #region manifest refresh
  protected resolveModulesPublishManifestUrl() {
    const modulesPublishOptions =
      this.runtimeContext.getAppModulesPublishOptions();

    const modulesPublishBaseUrl = modulesPublishOptions?.base_url;
    if (!modulesPublishBaseUrl) return null;

    return new URL(
      modulesPublishOptions.manifest_file || "manifest.json",
      modulesPublishBaseUrl
    );
  }

  // 获取远程模块 manifest 清单
  protected fetchModulesPublishManifest(
    publishManifestUrl: URL,
    lastRefreshInfo: Record<string, any>
  ) {
    const headers: Record<string, string> = {};

    if (lastRefreshInfo.etag) {
      headers["If-None-Match"] = lastRefreshInfo.etag;
    }

    return got(publishManifestUrl.toString(), {
      headers,
      throwHttpErrors: false, // 304 不抛出异常
    });
  }

  async ensureManifestFresh() {
    const manifestTtl =
      this.runtimeContext.getAppModulesFederationOptions().manifest_ttl || 300; // 默认 5分钟

    const manifestLastRefresh = this.getLocalManifestLastRefreshInfo();

    const now = new Date();
    const lastRefreshDate = manifestLastRefresh.refreshedAt as Date;
    const refreshElapsedMs = now.getTime() - lastRefreshDate.getTime();

    if (refreshElapsedMs <= manifestTtl * 1000) return; // 未到 定时刷新时间

    const publishManifestUrl = this.resolveModulesPublishManifestUrl();
    if (!publishManifestUrl) return; // 未配置 manifest 发布地址

    const fetchManifestResponse = await this.fetchModulesPublishManifest(
      publishManifestUrl,
      manifestLastRefresh
    );

    if (fetchManifestResponse.statusCode === 304) {
      // 远端 manifest 未更新, 仅刷新 refreshedAt 时间
      this.setLocalManifestRefreshDate(now);

      // 持久化到 磁盘文件
      await this.writeLocalManifestRefreshInfoToFile(now, manifestLastRefresh);
      return;
    }

    if (
      fetchManifestResponse.statusCode >= 200 &&
      fetchManifestResponse.statusCode < 300
    ) {
      const responseETag = fetchManifestResponse.headers["etag"] || "";
      const manifestJsonStr = fetchManifestResponse.body;

      const manifestInfo = JSON.parse(
        manifestJsonStr
      ) as AppModuleFederationManifest;

      this.saveLocalManifestRefreshInfo(now, { etag: responseETag });
      this.saveLocalManifestInfo(manifestInfo);

      // 持久化到 磁盘文件
      await this.writeLocalManifestRefreshInfoToFile(now, {
        etag: responseETag,
      });
      await this.writeLocalManifestInfoToFile(manifestInfo);
    }
  }
  // #endregion

  // #region download module
  protected resolveModuleReleaseFileUrl(
    moduleInfoBase: AppRemoteModuleMetaInfo
  ) {
    const modulesPublishOptions =
      this.runtimeContext.getAppModulesPublishOptions();

    const modulesPublishBaseUrl = modulesPublishOptions?.base_url;
    if (!modulesPublishBaseUrl) return null;

    return new URL(moduleInfoBase.url, modulesPublishBaseUrl);
  }

  protected async downloadModule(remoteModule: AppRemoteModuleInfo) {
    const moduleReleaseFileUrl = this.resolveModuleReleaseFileUrl(remoteModule);
    if (!moduleReleaseFileUrl) return null; // 未配置 module 发布地址

    const moduleReleaseDownloadFilePath =
      this.resolveModuleReleaseDownloadFilePath(
        remoteModule,
        moduleReleaseFileUrl
      );

    const moduleReleaseSha512 = remoteModule.integrity?.slice(7); // 去除 sha512- 前缀

    try {
      await httpDownloadFile(
        moduleReleaseFileUrl.href,
        moduleReleaseDownloadFilePath,
        moduleReleaseSha512
      );

      return moduleReleaseDownloadFilePath;
    } catch (error) {
      //Todo: 输出到 renderer 控制台错误日志，远端模块 下载失败
      return null;
    }
  }
  // #endregion

  // #region install module
  protected async extractModuleReleaseToInstallDir(
    moduleInfoBase: AppRemoteModuleMetaInfo,
    moduleReleaseDownloadFilePath: string
  ) {
    const moduleInstallExtractDirPath =
      this.resolveModuleInstallExtractDirPath(moduleInfoBase);

    try {
      // 先删除安装解压目录 后重新创建
      await fs.promises.rm(moduleInstallExtractDirPath, {
        recursive: true,
        force: true,
      });
      await fs.promises.mkdir(moduleInstallExtractDirPath, {
        recursive: true,
      });

      extractAll(moduleReleaseDownloadFilePath, moduleInstallExtractDirPath);

      return true;
    } catch (error) {
      //Todo: 输出到 renderer 控制台错误日志，模块解压失败
      return false;
    }
  }

  protected async installModule(
    remoteModule: AppRemoteModuleInfo,
    moduleReleaseDownloadFilePath: string
  ) {
    const moduleReleaseExtractSuccess =
      await this.extractModuleReleaseToInstallDir(
        remoteModule,
        moduleReleaseDownloadFilePath
      );

    if (moduleReleaseExtractSuccess) {
      // 删除下载文件
      fs.promises
        .rm(moduleReleaseDownloadFilePath, { force: true })
        .catch(() => {}); // 忽略 文件删除错误

      await this.setInstalledModuleInfoFromFile(remoteModule);
    }

    return moduleReleaseExtractSuccess;
  }
  // #endregion

  // #region attach/detach module
  protected async attachModule(remoteModule: AppRemoteModuleInfo) {}

  protected async detachModule(remoteModule: AppRemoteModuleInfo) {}
  // #endregion

  // #region load modules
  protected async resolveManifestListenModules(channel: string) {
    await this.ensureManifestFresh();

    const manifestModules = this.runtimeContext.getRuntimeInfoSubValue(
      runtimeKeys.app_moduleFederation,
      ["manifest", "modules"]
    ) as Record<string, AppRemoteModuleInfo>;

    const listenModules = Object.entries(manifestModules)
      .filter(
        ([_, moduleInfo]) =>
          moduleInfo.ipc.channels[channel]?.action === "listen"
      )
      .map(([_, moduleInfo]) => moduleInfo);

    return listenModules;
  }

  protected async resolveManifestHandleModule(channel: string) {
    await this.ensureManifestFresh();

    const manifestModules = this.runtimeContext.getRuntimeInfoSubValue(
      runtimeKeys.app_moduleFederation,
      ["manifest", "modules"]
    ) as Record<string, AppRemoteModuleInfo>;

    const handleModules = Object.entries(manifestModules)
      .filter(
        ([_, moduleInfo]) =>
          moduleInfo.ipc.channels[channel]?.action === "handle"
      )
      .map(([_, moduleInfo]) => moduleInfo);

    if (handleModules.length === 1) return handleModules[0];

    if (handleModules.length > 1) {
      //Todo: 输出到 renderer 控制台错误日志，存在多个 handle 模块
    }

    return null; // 未找到 唯一的 handle 模块
  }

  protected async loadModule(remoteModule: AppRemoteModuleInfo) {
    const moduleInstallExtractDirPath =
      this.resolveModuleInstallExtractDirPath(remoteModule);

    const moduleEntryFilePath = path.join(
      moduleInstallExtractDirPath,
      "index.mjs"
    );

    if (!fs.existsSync(moduleEntryFilePath)) {
      const moduleReleaseDownloadFilePath = await this.downloadModule(
        remoteModule
      );
      if (!moduleReleaseDownloadFilePath) return; // 模块下载失败

      const moduleInstallSuccess = await this.installModule(
        remoteModule,
        moduleReleaseDownloadFilePath
      );
      if (!moduleInstallSuccess) return; // 模块安装失败
    }

    this.attachModule(remoteModule);
  }

  async ensureListenModules(channel: string) {
    await this.ensureManifestFresh();

    const formatModuleKey = (module: AppRemoteModuleInfo) =>
      `${module.moduleId}@${module.version}`;

    const attachedListenModules = this.getAttachedListenModuleInfos(channel);
    const attachedListenModuleSet = new Set(
      attachedListenModules.map(formatModuleKey)
    );

    const remoteListenModules = await this.resolveManifestListenModules(
      channel
    );
    const remoteListenModuleSet = new Set(
      remoteListenModules.map(formatModuleKey)
    );

    const attachedNotRemoteListenModules = attachedListenModules.filter(
      (module) => !remoteListenModuleSet.has(formatModuleKey(module))
    );
    for (const attachedListenModule of attachedNotRemoteListenModules) {
      // 已加载的模块 不再 listen该channel，或者 版本有更新，则卸载该模块
      this.detachModule(attachedListenModule);
    }

    const remoteNotAttachedListenModules = remoteListenModules.filter(
      (module) => !attachedListenModuleSet.has(formatModuleKey(module))
    );
    for (const remoteListenModule of remoteNotAttachedListenModules) {
      await this.loadModule(remoteListenModule);
    }
  }

  async ensureHandleModule(channel: string) {
    await this.ensureManifestFresh();

    let attachedHandleModule = this.getAttachedHandleModuleInfo(channel);

    const remoteHandleModule = await this.resolveManifestHandleModule(channel);

    if (attachedHandleModule) {
      if (
        !remoteHandleModule ||
        attachedHandleModule.moduleId !== remoteHandleModule.moduleId ||
        attachedHandleModule.version !== remoteHandleModule.version
      ) {
        // 已加载的模块 不再 handle该channel，或者 版本有更新，则卸载该模块
        this.detachModule(attachedHandleModule);

        attachedHandleModule = undefined; // 卸载完后 重置
      }
    }

    if (remoteHandleModule && !attachedHandleModule) {
      await this.loadModule(remoteHandleModule);
    }
  }
  // #endregion
}
