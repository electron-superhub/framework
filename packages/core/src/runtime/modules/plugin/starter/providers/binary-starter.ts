import { ChildProcess, spawn, SpawnOptions } from "node:child_process";

import {
  AppContext,
  AppPluginArgPassModes,
  AppPluginInfo,
  AppPluginInfoBase,
  AppPluginType,
  AppPluginTypes,
} from "../../../../../types";
import { AppPluginStarter, AppPluginStarterBase } from "./plugin-starter";

export class AppBinaryPluginStarter
  extends AppPluginStarterBase
  implements AppPluginStarter
{
  constructor(context: AppContext) {
    super(context);
  }

  get targetType(): AppPluginType {
    return AppPluginTypes.Binary;
  }

  // #region start plugin
  async startAppPlugin(
    pluginInfo: AppPluginInfo,
    stdMsgListener?: (stdMsg: string) => void
  ) {
    const pluginBinFilePath = await this.resolvePluginBinFilePath(pluginInfo);

    const pluginListenPort = await this.resolvePluginListenPort(pluginInfo);

    const cmdArgs = this.buildPluginStartCmdArgs(pluginInfo, pluginListenPort);
    const spawnOptions = this.buildPluginStartSpawnOptions(
      pluginInfo,
      pluginListenPort
    );

    const pluginProcess = spawn(pluginBinFilePath, cmdArgs, spawnOptions);

    return new Promise<number>((resolve, reject) => {
      pluginProcess.stdout!.on("data", (data) => {
        if (data.includes(pluginInfo.startOptions.successStdout)) {
          pluginProcess.removeAllListeners();

          this.savePluginStartedProcess(
            pluginInfo,
            pluginProcess,
            pluginListenPort
          );

          this.configurePluginProcessStdOutput(
            pluginInfo,
            pluginProcess,
            stdMsgListener
          );

          resolve(pluginListenPort);
        }
      });

      pluginProcess.stderr!.on("data", (data) => {
        this.killPluginProcess(pluginProcess);

        reject(new Error(`插件进程 错误输出 stderr: ${data}`));
      });

      pluginProcess.on("error", (err) => {
        this.killPluginProcess(pluginProcess);

        reject(new Error(`插件进程 异常 error: ${err?.message}`));
      });

      pluginProcess.once("exit", (code) => {
        reject(new Error(`插件进程 异常退出 code: ${code}`));
      });
    });
  }

  private buildPluginStartSpawnOptions(
    pluginInfo: AppPluginInfo,
    pluginListenPort: number
  ) {
    const options = <SpawnOptions>{
      cwd: this.resolvePluginBinDirPath(pluginInfo),
      stdio: "pipe",
      env: { ...process.env, ...(pluginInfo.startOptions.additionalEnv ?? {}) },
    };

    if (pluginInfo.startOptions.portArgPassMode === AppPluginArgPassModes.Env) {
      options.env = {
        ...options.env,
        [pluginInfo.startOptions.portArgName]: pluginListenPort.toString(),
      };
    }

    return options;
  }

  private configurePluginProcessStdOutput(
    pluginInfoBase: AppPluginInfoBase,
    pluginProcess: ChildProcess,
    stdMsgListener?: (stdMsg: string) => void
  ) {
    pluginProcess.stdout!.on("data", (data) => {
      stdMsgListener?.(`stdout: ${data}`);
    });

    pluginProcess.stderr!.on("data", (data) => {
      stdMsgListener?.(`stderr: ${data}`);
    });

    pluginProcess.on("error", (err) => {
      stdMsgListener?.(`error: ${err?.message}`);
    });

    pluginProcess.once("exit", (code) => {
      stdMsgListener?.(`exited with code: ${code}`);

      this.removePluginStartedProcess(pluginInfoBase);
    });
  }
  // #endregion

  // #region stop plugin
  async stopAppPlugin(pluginInfoBase: AppPluginInfoBase) {
    const startedProcess = this.resolvePluginStartedProcess(pluginInfoBase);
    if (!startedProcess) return;

    this.killPluginProcess(startedProcess as ChildProcess);

    this.removePluginStartedProcess(pluginInfoBase);
  }

  private killPluginProcess(pluginProcess: ChildProcess) {
    if (pluginProcess) {
      pluginProcess.removeAllListeners();
      pluginProcess.kill();
    }
  }
  // #endregion
}
