import {
  AppContext,
  AppModule,
  AppPluginInfo,
  AppPluginMetaInfo,
  AppPluginTypes,
} from "../../../../types";
import {
  AppPluginsBase,
  ipcMainEvents,
  registerIpcMainEvent,
} from "../../../core";
import {
  AppBinaryPluginStarter,
  AppNodejsPluginStarter,
  AppPluginStarter,
} from "./providers";

const ipcMainEvents_pluginsStarter = {
  app_plugins_startPlugin: "app:plugins:start-plugin",
  app_plugins_stopPlugin: "app:plugins:stop-plugin",
} as const;

type IpcMainEvents_pluginsStarter = typeof ipcMainEvents_pluginsStarter;

declare module "../../../core" {
  interface IpcMainEvents extends IpcMainEvents_pluginsStarter {}
}

const ipcMainRendererEvents_pluginsStarter = {
  on: {
    pluginsStarter_pluginStartError:
      "renderer:on:plugins-starter:plugin-start-error",
    pluginsStarter_pluginStarted: "renderer:on:plugins-starter:plugin-started",
    pluginsStarter_pluginConsoleOutput:
      "renderer:on:plugins-starter:plugin-console-output",
    pluginsStarter_pluginStopError:
      "renderer:on:plugins-starter:plugin-stop-error",
    pluginsStarter_pluginStopped: "renderer:on:plugins-starter:plugin-stopped",
  },
  send: {
    ...ipcMainEvents_pluginsStarter,
  },
};

class AppPluginsStarter extends AppPluginsBase implements AppModule {
  private pluginsStopStatus: string = "none";

  async init(context: AppContext): Promise<void> {
    super.load(context);

    this.registerToIpcMainEvents();

    await this.initSetInstalledPluginInfos();
    this.doStartInstalledPlugins();

    this.listenAppPluginsStartStopEvents();

    this.registerToIpcRendererEvents();
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_pluginsStarter).forEach(
      ([eventKey, eventName]) => {
        registerIpcMainEvent(eventKey, eventName);
      }
    );
  }

  private listenAppPluginsStartStopEvents() {
    this.contextIpcMain.on(
      ipcMainEvents_pluginsStarter.app_plugins_startPlugin,
      (event, pluginInfoBase) => {
        this.doStartAppPlugin(pluginInfoBase);
      }
    );

    this.contextIpcMain.on(
      ipcMainEvents_pluginsStarter.app_plugins_stopPlugin,
      (event, pluginInfoBase, resultNotify) => {
        this.doStopAppPlugin(pluginInfoBase, resultNotify);
      }
    );

    this.contextApp.on("will-quit", async (event) => {
      if (this.isPluginsStopped()) {
        this.clearPluginsStopStatus();
        return; // 直接return, 同时清除stop status
      }

      if (this.isPluginsStopping()) {
        event.preventDefault(); //所有插件 还没全部停止, 阻止默认退出
        return;
      }

      this.setPluginsStopping();

      await this.doStopInstalledPlugins()
        .then(() => {
          this.setPluginsStopped(); // 下一次will-quit时 不再 阻止默认退出
        })
        .catch((error) => {
          this.contextIpcMain.emit(ipcMainEvents.app_showNotification, null, {
            title: "插件停止失败",
            body: `应用退出时 停止插件失败: ${error?.message}`,
          });

          this.contextApp.exit(1);
        });
    });
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererOnEvents(
      ipcMainRendererEvents_pluginsStarter.on
    );

    this.runtimeContext.registerIpcRendererSendEvents(
      ipcMainRendererEvents_pluginsStarter.send
    );
  }

  // #region start plugins
  private async doStartInstalledPlugins() {
    const installedPluginInfos = this.getInstalledPluginInfos();

    installedPluginInfos.forEach((pluginInfo) => {
      this.doStartInstalledPlugin(pluginInfo);
    });
  }
  // #endregion

  // #region stop plugins
  private async doStopInstalledPlugins() {
    const installedPluginInfos = this.getInstalledPluginInfos();

    for (const pluginInfo of installedPluginInfos) {
      await this.doStopInstalledPlugin(pluginInfo, null, true);
    }
  }

  // #region stop status
  private isPluginsStopped() {
    return this.pluginsStopStatus === "stopped";
  }

  private isPluginsStopping() {
    return this.pluginsStopStatus === "stopping";
  }

  private setPluginsStopping() {
    this.pluginsStopStatus = "stopping";
  }

  private setPluginsStopped() {
    this.pluginsStopStatus = "stopped";
  }

  private clearPluginsStopStatus() {
    this.pluginsStopStatus = "none";
  }
  // #endregion

  // #endregion

  // #region start/stop plugin
  private doStartAppPlugin(pluginInfoBase: AppPluginMetaInfo) {
    const pluginInfo = this.getInstalledPluginInfo(pluginInfoBase);

    this.doStartInstalledPlugin(pluginInfo);
  }

  private doStopAppPlugin(
    pluginInfoBase: AppPluginMetaInfo,
    resultNotify: any
  ) {
    const pluginInfo = this.getInstalledPluginInfo(pluginInfoBase);

    this.doStopInstalledPlugin(pluginInfo, resultNotify);
  }

  private doStartInstalledPlugin(pluginInfo: AppPluginInfo) {
    this.resolvePluginStarter(pluginInfo)
      .then((pluginStarter) => {
        return pluginStarter.startAppPlugin(pluginInfo, (stdMsg) => {
          this.emitPluginConsoleOutput(pluginInfo, stdMsg);
        });
      })
      .then((listenPort) => {
        this.emitPluginStarted(pluginInfo, listenPort);
      })
      .catch((error) => {
        this.emitPluginStartError(pluginInfo, error);
      });
  }

  private async doStopInstalledPlugin(
    pluginInfo: AppPluginInfo,
    resultNotify?: any,
    throwError: boolean = false
  ) {
    try {
      const pluginStarter = await this.resolvePluginStarter(pluginInfo);
      await pluginStarter.stopAppPlugin(pluginInfo);

      this.emitPluginStopped(pluginInfo, resultNotify?.event);
    } catch (error: any) {
      if (throwError) throw error;
      this.emitPluginStopError(pluginInfo, error, resultNotify?.event);
    }
  }

  private async resolvePluginStarter(
    pluginInfo: AppPluginInfo
  ): Promise<AppPluginStarter> {
    if (!pluginInfo) throw new Error("未找到安装插件信息");

    const pluginStarter = this.getCachedPluginStarter(pluginInfo);
    if (pluginStarter) return pluginStarter;

    const newPluginStarter = await this.createPluginStarter(pluginInfo);
    this.savePluginStarterToCache(newPluginStarter);

    return newPluginStarter;
  }

  private async createPluginStarter(
    pluginInfo: AppPluginInfo
  ): Promise<AppPluginStarter> {
    const pluginType = pluginInfo.type;

    switch (pluginType) {
      case AppPluginTypes.NodeJs:
        return new AppNodejsPluginStarter(this.context);
      case AppPluginTypes.Binary:
        return new AppBinaryPluginStarter(this.context);
      default:
        throw new Error(`不支持的插件类型 ${pluginType}`);
    }
  }
  // #endregion

  // #region emit renderer events
  private emitPluginStartError(pluginInfo: AppPluginInfo, error: Error) {
    const pluginStartError = new Error(
      `插件 ${pluginInfo?.productName} 启动失败: ${error?.message}`
    );

    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsStarter.on.pluginsStarter_pluginStartError,
      null,
      pluginStartError
    );

    this.contextIpcMain.emit(ipcMainEvents.app_showNotification, null, {
      title: "插件启动失败",
      body: pluginStartError.message,
    });
  }

  private emitPluginStarted(pluginInfo: AppPluginInfo, listenPort: number) {
    const { startOptions, ...omitPluginInfo } = pluginInfo; //排除 startOptions 属性

    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsStarter.on.pluginsStarter_pluginStarted,
      null,
      {
        ...omitPluginInfo,
        listenPort,
      }
    );

    this.contextIpcMain.emit(ipcMainEvents.app_showNotification, null, {
      title: "插件启动成功",
      body: `插件 ${pluginInfo.productName} 启动成功, 端口: ${listenPort}`,
    });
  }

  private emitPluginConsoleOutput(pluginInfo: AppPluginInfo, stdMsg: string) {
    const consoleOutputMsg = `[plugin-process-console]--[${pluginInfo.name}]: ${stdMsg}`;

    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsStarter.on
        .pluginsStarter_pluginConsoleOutput,
      null,
      consoleOutputMsg
    );
  }

  private emitPluginStopError(
    pluginInfo: AppPluginInfo,
    error: Error,
    resultNotifyEvent?: string
  ) {
    const pluginStopError = new Error(
      `插件 ${pluginInfo?.productName} 停止失败: ${error?.message}`
    );

    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsStarter.on.pluginsStarter_pluginStopError,
      null,
      pluginStopError
    );

    this.contextIpcMain.emit(ipcMainEvents.app_showNotification, null, {
      title: "插件停止失败",
      body: pluginStopError.message,
    });

    if (resultNotifyEvent) {
      this.contextIpcMain.emit(resultNotifyEvent, null, {
        stopped: false,
        error: pluginStopError,
      });
    }
  }

  private emitPluginStopped(
    pluginInfo: AppPluginInfo,
    resultNotifyEvent?: string
  ) {
    const { startOptions, ...omitPluginInfo } = pluginInfo; //排除 startOptions 属性

    this.contextIpcMain.emit(
      ipcMainRendererEvents_pluginsStarter.on.pluginsStarter_pluginStopped,
      null,
      omitPluginInfo
    );

    this.contextIpcMain.emit(ipcMainEvents.app_showNotification, null, {
      title: "插件停止成功",
      body: `插件 ${pluginInfo.productName} 停止成功`,
    });

    if (resultNotifyEvent) {
      this.contextIpcMain.emit(resultNotifyEvent, null, { stopped: true });
    }
  }
  // #endregion

  // #region starter runtime infos
  private getCachedPluginStarter(pluginInfo: AppPluginInfo) {
    return this.runtimeContext.getRuntimeInfoSubValue(this.pluginsRuntimeKey, [
      "starters",
      pluginInfo.type,
    ]) as AppPluginStarter;
  }

  private savePluginStarterToCache(pluginStarter: AppPluginStarter) {
    this.runtimeContext.updateRuntimeInfoSubValue(
      this.pluginsRuntimeKey,
      ["starters"],
      {
        [pluginStarter.targetType]: pluginStarter,
      }
    );
  }
  // #endregion
}

export function handlePluginsStarter() {
  return new AppPluginsStarter();
}
