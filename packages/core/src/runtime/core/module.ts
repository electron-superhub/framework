import { AppContext } from "../../types";
import { DefaultAppRuntimeContext } from "./context";

export abstract class AppModuleBase {
  protected context!: AppContext;

  protected load(context: AppContext) {
    this.context = context;
  }

  get contextApp() {
    return this.context.app;
  }

  get contextIpcMain() {
    return this.context.ipcMain;
  }

  get runtimeContext() {
    return this.context.runtimeContext as DefaultAppRuntimeContext;
  }
}
