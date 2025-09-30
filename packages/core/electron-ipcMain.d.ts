declare namespace Electron {
  interface IpcMain {
    __handlePatched?: boolean;
    hasHandler(channel: string): boolean;
    invokeHandle(
      channel: string,
      event: IpcMainInvokeEvent,
      ...args: any[]
    ): Error | Promise<any> | any;
    handleChannels(): string[];
    __listenPatched?: boolean;
    on(
      channel: string,
      listener: (event: IpcMainEvent, ...args: any[]) => void,
      moduleName?: string
    ): this;
    addListener(
      channel: string,
      listener: (event: IpcMainEvent, ...args: any[]) => void,
      moduleName?: string
    ): this;
  }
}
