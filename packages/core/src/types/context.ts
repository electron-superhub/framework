export interface AppContext {
  readonly app: Electron.App;
  readonly ipcMain: Electron.IpcMain;
  readonly runtimeContext: AppRuntimeContext;
}

export interface AppPackageInfo {
  name: string;
  productName: string;
  description: string;
  version: string;
  appConfigs: Record<string, any>;
}

export interface AppRuntimeContext {
  setRuntimeInfo(key: string, value: Record<string, any>): void;

  updateRuntimeInfo(key: string, value: Record<string, any>): void;

  getRuntimeInfo(key: string): Record<string, any>;

  hasRuntimeInfo(key: string): boolean;

  getRuntimeInfoKeys(): string[];

  getRuntimeInfoSubValue(key: string, subPaths: string[]): any;

  updateRuntimeInfoSubValue(
    key: string,
    subPaths: string[],
    value: Record<string, any>
  ): void;
}
