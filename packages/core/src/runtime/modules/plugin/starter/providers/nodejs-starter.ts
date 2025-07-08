import { ForkOptions, UtilityProcess, utilityProcess } from "electron";

import {
  AppContext,
  AppPluginArgPassModes,
  AppPluginInfo,
  AppPluginInfoBase,
  AppPluginType,
  AppPluginTypes,
} from "../../../../../types";
import { AppPluginStarter, AppPluginStarterBase } from "./plugin-starter";

export class AppNodejsPluginStarter
  extends AppPluginStarterBase
  implements AppPluginStarter
{
  constructor(context: AppContext) {
    super(context);
  }

  get targetType(): AppPluginType {
    return AppPluginTypes.NodeJs;
  }

  // #region start plugin
  async startAppPlugin(
    pluginInfo: AppPluginInfo,
    stdMsgListener?: (stdMsg: string) => void
  ) {
    const pluginBinFilePath = await this.resolvePluginBinFilePath(pluginInfo);

    const pluginListenPort = await this.resolvePluginListenPort(pluginInfo);

    const cmdArgs = this.buildPluginStartCmdArgs(pluginInfo, pluginListenPort);
    const forkOptions = this.buildPluginStartForkOptions(
      pluginInfo,
      pluginListenPort
    );

    const pluginProcess = utilityProcess.fork(
      pluginBinFilePath,
      cmdArgs,
      forkOptions
    );

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

      pluginProcess.once("exit", (code) => {
        reject(new Error(`插件进程 异常退出 code: ${code}`));
      });
    });
  }

  private buildPluginStartForkOptions(
    pluginInfo: AppPluginInfo,
    pluginListenPort: number
  ) {
    const options = <ForkOptions>{
      cwd: this.resolvePluginBinDirPath(pluginInfo),
      stdio: "pipe",
      execArgv: [
        "--enable-source-maps",
        "--trace-warnings",
        "--abort-on-uncaught-exception",
        ...(pluginInfo.startOptions.nodeRuntimeArgv ?? []),
      ],
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
    pluginProcess: UtilityProcess,
    stdMsgListener?: (stdMsg: string) => void
  ) {
    pluginProcess.stdout!.on("data", (data) => {
      stdMsgListener?.(`stdout: ${data}`);
    });

    pluginProcess.stderr!.on("data", (data) => {
      stdMsgListener?.(`stderr: ${data}`);
    });

    pluginProcess.once("exit", (code) => {
      stdMsgListener?.(`exited with code: ${code}`);

      this.removePluginStartedProcess(pluginInfoBase);
    });
  }
  // #endregion

  // #region stop plugin
  async stopAppPlugin(pluginInfoBase: AppPluginInfoBase): Promise<void> {
    const startedProcess = this.resolvePluginStartedProcess(pluginInfoBase);
    if (!startedProcess) return;

    this.killPluginProcess(startedProcess as UtilityProcess);

    this.removePluginStartedProcess(pluginInfoBase);
  }

  private killPluginProcess(pluginProcess: UtilityProcess) {
    if (pluginProcess) {
      pluginProcess.removeAllListeners();
      pluginProcess.kill();
    }
  }
  // #endregion
}
