declare namespace Electron {
  interface IpcMain {
    __handlePatched?: boolean;
    handle(
      channel: string,
      listener: (
        event: IpcMainInvokeEvent,
        ...args: any[]
      ) => Promise<any> | any,
      moduleName?: string
    ): void;
    hasHandler(channel: string): boolean;
    invokeHandle(
      channel: string,
      event: IpcMainInvokeEvent,
      ...args: any[]
    ): Error | Promise<any> | any;
    handleModule(channel: string): string | undefined;
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
    hasListener(channel: string, moduleName?: string): boolean;
    listenModules(channel: string, exceptInternal?: boolean): string[];
  }
}
