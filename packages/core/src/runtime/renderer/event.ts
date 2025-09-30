import { registerIpcMainEvent } from "../core/event";

const ipcMainEvents_ipcRenderer = {
  app_getRendererEvents: "app:get-renderer-events",
  app_moduleFederation_send: "app:module-federation:send",
  app_moduleFederation_invoke: "app:module-federation:invoke",
} as const;

type IpcMainEvents_ipcRenderer = typeof ipcMainEvents_ipcRenderer;

declare module "../core" {
  interface IpcMainEvents extends IpcMainEvents_ipcRenderer {}
}

export function registerRendererIpcMainEvents() {
  Object.entries(ipcMainEvents_ipcRenderer).forEach(([eventKey, eventName]) => {
    registerIpcMainEvent(eventKey, eventName);
  });
}
