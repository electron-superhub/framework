export enum AppPluginTypes {
  NodeJs = "NodeJs",
  Binary = "Binary",
}

export enum AppPluginArgPassModes {
  Cmd = "Cmd",
  Env = "Env",
}

export type AppPluginType = keyof typeof AppPluginTypes;
export type AppPluginArgPassMode = keyof typeof AppPluginArgPassModes;

export interface AppPluginInfoBase {
  pluginId: string;
  name: string;
  productName: string;
  description: string;
  version: string;
}

export interface AppPluginStartOptions {
  binFileDir: string; //bin文件 所在目录
  binFileName: string; //bin文件名称
  binFileExt?: string; //bin文件扩展名
  cmdArgv?: string[]; //子进程 命令行参数
  cmdPassAppInfo?: boolean; //命令行参数是否传递app信息
  nodeRuntimeArgv?: string[]; //nodejs运行时 参数
  additionalEnv?: Record<string, string>; //附加环境变量
  portEnvKey: string; //端口环境变量名, 从该环境变量获取端口号
  portArgPassMode: AppPluginArgPassMode; //端口参数 传递方式
  portArgName: string; //端口参数名称
  successStdout: string; //启动成功后的输出信息
}

export interface AppPluginInfo extends AppPluginInfoBase {
  type: AppPluginType;
  startOptions: AppPluginStartOptions;
}

export interface AppPluginPublishInfo extends AppPluginInfoBase {
  url: string;
  sha512: string;
  size: number;
  releaseDate: string;
}

export interface AppPluginProgressInfo extends AppPluginPublishInfo {
  progress: {
    percent: number;
    transferred: number;
    total?: number;
  };
}

export interface AppPluginDownloadedInfo extends AppPluginPublishInfo {
  downloadedFilePath: string;
}
