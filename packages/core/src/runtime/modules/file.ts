import path from "node:path";
import { v4 as uuidv4 } from "uuid";

import { AppContext, AppModule } from "../types";
import { AppModuleBase, ipcMainEvents } from "../core";
import { copyFileReportProgress } from "../utils";

const ipcMainRendererEvents_file = {
  on: {
    file_copyProgress: "renderer:on:file:copy-progress",
  },
  invoke: {
    file_copyToDirectory: "renderer:invoke:file:copy-to-directory",
  },
};

class AppFileHandler extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.handleFileCopyToDirectory();

    this.registerToIpcRendererEvents();
  }

  private handleFileCopyToDirectory() {
    this.contextIpcMain.handle(
      ipcMainRendererEvents_file.invoke.file_copyToDirectory,
      (event, sourceFilePath, destDir) =>
        this.copyFileToDirectory(sourceFilePath, destDir)
    );
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererOnEvents(
      ipcMainRendererEvents_file.on
    );

    this.runtimeContext.registerIpcRendererInvokeEvents(
      ipcMainRendererEvents_file.invoke
    );
  }

  private copyFileToDirectory(
    sourceFilePath: string,
    destDir: string
  ): Promise<string | null> {
    const destFilePath = this.buildDestFilePath(sourceFilePath, destDir);

    const copyFilePromise = copyFileReportProgress(
      sourceFilePath,
      destFilePath,
      (progress) =>
        this.contextIpcMain.emit(
          ipcMainRendererEvents_file.on.file_copyProgress,
          null,
          progress
        )
    );

    return copyFilePromise
      .then(() => destFilePath)
      .catch((err) => {
        this.contextIpcMain.emit(ipcMainEvents.app_showNotification, null, {
          title: "文件复制失败",
          body: `源文件 ${sourceFilePath} 复制到目录 ${destDir} 失败: ${err.message}`,
        });

        return null;
      });
  }

  private buildDestFilePath(sourceFilePath: string, destDir: string) {
    const sourceFileExt = path.extname(sourceFilePath);
    const destFileName = uuidv4().replace(/-/g, "") + sourceFileExt;

    return path.join(destDir, destFileName);
  }
}

export function handleFileOps() {
  return new AppFileHandler();
}
