export interface IpcMainEvents {}

export const ipcMainEvents = {} as IpcMainEvents & Record<string, string>;

export function registerIpcMainEvent(eventKey: string, eventName: string) {
  ipcMainEvents[eventKey] = eventName;
}
