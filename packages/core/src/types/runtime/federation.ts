export interface AppRemoteModuleMetaInfo {
  moduleId: string;
  name: string;
  uniqueName: string; // 唯一名称
  description: string;
  version: string;
  url: string;
  integrity: string;
}

export interface AppRemoteModuleExportMeta {
  attach: string; // 挂载点
  detach: string; // 卸载点
}

export interface AppRemoteModuleIpcMeta {
  channels: {
    [channel: string]: {
      action: "listen" | "handle";
    };
  };
}

export interface AppRemoteModuleInfo extends AppRemoteModuleMetaInfo {
  exports: AppRemoteModuleExportMeta;
  ipc: AppRemoteModuleIpcMeta;
}

export interface AppModuleFederationManifest {
  schemaVersion: string;
  publishedAt: string;
  modules: Record<string, AppRemoteModuleInfo>;
}
