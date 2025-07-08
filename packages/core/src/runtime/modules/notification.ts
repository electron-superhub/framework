import { Notification } from "electron";

import { AppContext, AppModule } from "../../types";
import { AppModuleBase, registerIpcMainEvent } from "../core";

const ipcMainEvents_notification = {
  app_showNotification: "app:show-notification",
} as const;

type IpcMainEvents_notification = typeof ipcMainEvents_notification;

declare module "../core" {
  interface IpcMainEvents extends IpcMainEvents_notification {}
}

const ipcMainRendererEvents_notification = {
  send: {
    ...ipcMainEvents_notification,
  },
};

class AppNotificationHandler extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.registerToIpcMainEvents();

    this.listenShowNotification();

    this.registerToIpcRendererEvents();
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_notification).forEach(
      ([eventKey, eventName]) => {
        registerIpcMainEvent(eventKey, eventName);
      }
    );
  }

  private listenShowNotification() {
    // Windows特殊设置, 保证Notification通知 标题栏显示appName
    if (this.runtimeContext.isWindowsPlatform()) {
      this.contextApp.setAppUserModelId(this.contextApp.name);
    }

    this.contextIpcMain.on(
      ipcMainEvents_notification.app_showNotification,
      (event, options) => {
        new Notification(options).show();
      }
    );
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererSendEvents(
      ipcMainRendererEvents_notification.send
    );
  }
}

export function handleNotification() {
  return new AppNotificationHandler();
}
