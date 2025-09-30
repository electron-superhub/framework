import { contextBridge, ipcRenderer } from "electron";

import { ipcMainEvents } from "./core/event";
import { registerRendererIpcMainEvents } from "./renderer/event";

registerRendererIpcMainEvents();

const invokeGetAppRendererEvents = () =>
  ipcRenderer.invoke(ipcMainEvents.app_getRendererEvents);

export const exposeRendererApiMethodsToMainWorld = async (
  exposeApiKey: string = "electronIpc"
) => {
  const exposeRendererApiMethods: Record<string, (...args: any[]) => any> =
    Object.create(null);

  const appIpcRendererEventsInfo = await invokeGetAppRendererEvents();

  const appIpcRendererOnEvents: Record<string, string> =
    appIpcRendererEventsInfo.onEvents;
  const appIpcRendererSendEvents: Record<string, string> =
    appIpcRendererEventsInfo.sendEvents;
  const appIpcRendererInvokeEvents: Record<string, string> =
    appIpcRendererEventsInfo.invokeEvents;

  Object.entries(appIpcRendererOnEvents).forEach(
    ([exposeApiMethodName, rendererOnEventName]) => {
      exposeRendererApiMethods[`accept_${exposeApiMethodName}`] = (
        listener: (...args: any[]) => void
      ) =>
        ipcRenderer.on(rendererOnEventName, (event, ...eventArgs: any[]) =>
          listener(...eventArgs)
        );
      if (rendererOnEventName.endsWith("console-output")) {
        ipcRenderer.on(rendererOnEventName, (event, message) =>
          console.log(message)
        );
      }
    }
  );

  Object.entries(appIpcRendererSendEvents).forEach(
    ([exposeApiMethodName, rendererSendEventName]) => {
      exposeRendererApiMethods[`send_${exposeApiMethodName}`] = (
        ...args: any[]
      ) => ipcRenderer.send(rendererSendEventName, ...args);
    }
  );

  Object.entries(appIpcRendererInvokeEvents).forEach(
    ([exposeApiMethodName, rendererInvokeEventName]) => {
      exposeRendererApiMethods[`invoke_${exposeApiMethodName}`] = (
        ...args: any[]
      ) => ipcRenderer.invoke(rendererInvokeEventName, ...args);
    }
  );

  exposeRendererApiMethods["accept"] = (
    channel: string,
    listener: (...args: any[]) => void
  ) =>
    ipcRenderer.on(channel, (event, ...eventArgs: any[]) => {
      listener(...eventArgs);
    });

  exposeRendererApiMethods["send"] = (channel: string, ...args: any[]) =>
    ipcRenderer.send(ipcMainEvents.app_moduleFederation_send, channel, ...args);

  exposeRendererApiMethods["invoke"] = (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(
      ipcMainEvents.app_moduleFederation_invoke,
      channel,
      ...args
    );

  contextBridge.exposeInMainWorld(exposeApiKey, exposeRendererApiMethods);
};
