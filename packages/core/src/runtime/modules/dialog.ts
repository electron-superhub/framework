import {
  dialog,
  BrowserWindow,
  FileFilter,
  OpenDialogOptions,
  OpenDialogReturnValue,
} from "electron";

import { AppContext, AppModule } from "../types";
import { AppModuleBase, registerIpcMainEvent } from "../core";

const ipcMainEvents_dialog = {
  app_showMessageBox: "app:show-messagebox",
} as const;

type IpcMainEvents_dialog = typeof ipcMainEvents_dialog;

declare module "../core" {
  interface IpcMainEvents extends IpcMainEvents_dialog {}
}

const fileFilterNameMapping: Record<string, string> = {
  doc: "Word文字",
  docx: "Word文字",
  xls: "Excel表格",
  xlsx: "Excel表格",
  txt: "文本文件",
  pdf: "PDF文件",
  zip: "压缩文件",
  rar: "压缩文件",
};

const ipcMainRendererEvents_dialog = {
  invoke: {
    ...ipcMainEvents_dialog,
    dialog_showOpenDialog: "renderer:invoke:dialog:show-open-dialog",
    dialog_showOpenFile: "renderer:invoke:dialog:show-open-file",
  },
};

class AppDialogHandler extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.registerToIpcMainEvents();

    this.handleMessageBox();

    this.handleOpenDialog();
    this.handleOpenFile();

    this.registerToIpcRendererEvents();
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_dialog).forEach(([eventKey, eventName]) => {
      registerIpcMainEvent(eventKey, eventName);
    });
  }

  private handleMessageBox() {
    this.contextIpcMain.handle(
      ipcMainEvents_dialog.app_showMessageBox,
      (event, options, modal) => {
        modal = !!modal;

        if (modal)
          return dialog.showMessageBox(
            BrowserWindow.getFocusedWindow()!,
            options
          );

        return dialog.showMessageBox(options);
      }
    );
  }

  private handleOpenDialog() {
    this.contextIpcMain.handle(
      ipcMainRendererEvents_dialog.invoke.dialog_showOpenDialog,
      (event, options, modal) => {
        modal = !!modal;

        if (modal)
          return dialog.showOpenDialog(
            BrowserWindow.getFocusedWindow()!,
            options
          );

        return dialog.showOpenDialog(options);
      }
    );
  }

  private handleOpenFile() {
    this.contextIpcMain.handle(
      ipcMainRendererEvents_dialog.invoke.dialog_showOpenFile,
      async (event, fileFilterStr, modal) => {
        modal = !!modal;

        const openFileOptions = this.buildOpenFileOptions(fileFilterStr);

        let dialogReturn: OpenDialogReturnValue;
        if (modal) {
          dialogReturn = await dialog.showOpenDialog(
            BrowserWindow.getFocusedWindow()!,
            openFileOptions
          );
        } else {
          dialogReturn = await dialog.showOpenDialog(openFileOptions);
        }

        if (!dialogReturn.canceled) {
          if (dialogReturn.filePaths.length === 1)
            return dialogReturn.filePaths[0]; //返回单个文件路径

          return dialogReturn.filePaths;
        }
      }
    );
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererInvokeEvents(
      ipcMainRendererEvents_dialog.invoke
    );
  }

  private buildOpenFileOptions(fileFilterStr: string): OpenDialogOptions {
    return {
      properties: ["openFile"],
      filters: this.parseFileFilters(fileFilterStr),
    };
  }

  private parseFileFilters(fileFilterStr: string): FileFilter[] {
    fileFilterStr ??= "";
    const fileFilterExts = fileFilterStr
      .split(",")
      .map((ext) => ext.trim().toLowerCase())
      .filter((ext) => ext.length > 0);

    const fileFilters = fileFilterExts.reduce((fileFilterArr, filterExt) => {
      const filterName = fileFilterNameMapping[filterExt] ?? filterExt;

      if (!fileFilterArr.some((fileFilter) => fileFilter.name === filterName)) {
        fileFilterArr.push({ name: filterName, extensions: [filterExt] });
      } else {
        const fileFilter = fileFilterArr.find(
          (fileFilter) => fileFilter.name === filterName
        )!;
        fileFilter.extensions.push(filterExt);
      }

      return fileFilterArr;
    }, [] as FileFilter[]);

    if (fileFilters.length === 0) {
      fileFilters.push({ name: "所有文件", extensions: ["*"] });
    } else {
      fileFilters.unshift({ name: "所有格式", extensions: fileFilterExts });
    }

    return fileFilters;
  }
}

export function handleDialog() {
  return new AppDialogHandler();
}
