import path from "node:path";

import { AppContext, AppModule } from "../types";
import { AppModuleBase, ipcMainEvents } from "../core";

const ipcMainRendererEvents_protocol = {
  on: {
    protocol_openQueryParams: "renderer:on:protocol:open-queryparams",
  },
  send: {
    protocol_setOpenQueryParams: "renderer:send:protocol:set-open-queryparams",
  },
  invoke: {
    protocol_getOpenQueryParams:
      "renderer:invoke:protocol:get-open-queryparams",
  },
};

class AppProtocolHandler extends AppModuleBase implements AppModule {
  private protocol_scheme!: string;

  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.protocol_scheme = this.resolveProtocolScheme();

    if (this.protocol_scheme) {
      this.checkDevSetProtocolClient();

      // 从 process.argv 中 解析协议url，适用于 windows/linux平台 首次启动
      this.checkResolveProcessProtocolUrlArg();
      this.listenAppOpenEvent(); // 适用于 mac平台首次启动 或者 所有平台第二实例启动

      this.handleProtocolEvents();

      this.registerToIpcRendererEvents();
    }
  }

  private resolveProtocolScheme(): string {
    const appConfigs = this.runtimeContext.getAppPackageConfigs();
    return appConfigs.protocol_scheme ?? "";
  }

  private checkDevSetProtocolClient() {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        this.contextApp.setAsDefaultProtocolClient(
          this.protocol_scheme,
          process.execPath,
          [path.resolve(process.argv[1])]
        );
      }
    }
  }

  private checkResolveProcessProtocolUrlArg() {
    const receivedOpenQueryParams = this.checkResolveProtocolUrlArgQueryParams(
      process.argv
    );

    if (receivedOpenQueryParams) {
      this.setRuntimeProtocolOpenQueryParams(receivedOpenQueryParams);
    }
  }

  private listenAppOpenEvent() {
    this.contextIpcMain.on(ipcMainEvents.app_open, (event, argv) => {
      this.checkhandleAppProtocolOpen(argv);
    });
  }

  private checkhandleAppProtocolOpen(argv: string[]) {
    const receivedOpenQueryParams =
      this.checkResolveProtocolUrlArgQueryParams(argv);
    if (receivedOpenQueryParams) {
      if (this.runtimeContext.isMainWindowWebContentsLoaded()) {
        this.contextIpcMain.emit(
          ipcMainRendererEvents_protocol.on.protocol_openQueryParams,
          null,
          JSON.stringify(receivedOpenQueryParams)
        );
      } else {
        //mainWindow 页面未加载时 先保存open参数，等待页面加载后 renderer invoke获取
        this.setRuntimeProtocolOpenQueryParams(receivedOpenQueryParams);
      }
    }
  }

  private handleProtocolEvents() {
    this.contextIpcMain.handle(
      ipcMainRendererEvents_protocol.invoke.protocol_getOpenQueryParams,
      () => {
        // renderer调用 获取Protocol open参数时 标识 mainWindow 页面已加载，
        // 后续 Protocol open参数 将直接通过 mainWindow 发送到 页面
        this.runtimeContext.setMainWindowWebContentsLoaded();

        return this.getRuntimeProtocolOpenQueryParams();
      }
    );

    this.contextIpcMain.on(
      ipcMainRendererEvents_protocol.send.protocol_setOpenQueryParams,
      (event, openQueryString) => {
        // 解析 openQueryString 并更新保存 open参数, 后续 页面刷新加载后 会调用 renderer invoke获取
        const openQueryParams = new URLSearchParams(openQueryString);

        this.setRuntimeProtocolOpenQueryParams(
          Object.fromEntries(openQueryParams.entries())
        );
      }
    );
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererOnEvents(
      ipcMainRendererEvents_protocol.on
    );

    this.runtimeContext.registerIpcRendererSendEvents(
      ipcMainRendererEvents_protocol.send
    );

    this.runtimeContext.registerIpcRendererInvokeEvents(
      ipcMainRendererEvents_protocol.invoke
    );
  }

  private resolveProtocolUrlArg(argv: string[]) {
    const protocolUrlPrefix = `${this.protocol_scheme}://`;

    return argv.find((arg) => arg.startsWith(protocolUrlPrefix));
  }

  private checkResolveProtocolUrlArgQueryParams(argv: string[]) {
    const protocolUrlArg = this.resolveProtocolUrlArg(argv);

    if (protocolUrlArg) {
      const receivedProtocolUrl = new URL(protocolUrlArg);
      return Object.fromEntries(receivedProtocolUrl.searchParams.entries());
    }
  }

  private setRuntimeProtocolOpenQueryParams(
    queryParams: Record<string, string>
  ) {
    const runtimeKey_app_open =
      this.runtimeContext.getCoreRuntimeKeys().app_open;

    this.runtimeContext.updateRuntimeInfoSubValue(
      runtimeKey_app_open,
      ["protocol"],
      { queryParams }
    );
  }

  private getRuntimeProtocolOpenQueryParams(): Record<string, string> {
    const runtimeKey_app_open =
      this.runtimeContext.getCoreRuntimeKeys().app_open;

    return (
      this.runtimeContext.getRuntimeInfoSubValue(runtimeKey_app_open, [
        "protocol",
        "queryParams",
      ]) ?? {}
    );
  }
}

export function handleProtocol() {
  return new AppProtocolHandler();
}
