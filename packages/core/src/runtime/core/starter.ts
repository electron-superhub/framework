import { app, ipcMain } from "electron";

import { AppContext, AppModule } from "../../types";
import { DefaultAppRuntimeContext } from "./context";

export class AppStarter implements PromiseLike<void> {
  private readonly appContext: AppContext;
  private startPromise: Promise<void>;

  constructor() {
    this.appContext = this.createAppContext();
    this.startPromise = Promise.resolve();
  }

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: (value: void) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>
  ): PromiseLike<TResult1 | TResult2> {
    return this.startPromise.then(onfulfilled, onrejected);
  }

  private createAppContext(): AppContext {
    return {
      app,
      ipcMain,
      runtimeContext: new DefaultAppRuntimeContext(),
    };
  }

  attach(appModule: AppModule) {
    this.startPromise = this.startPromise.then(() =>
      appModule.init(this.appContext)
    );

    return this;
  }

  whenAppReady() {
    this.startPromise = this.startPromise.then(() => app.whenReady());

    return this;
  }

  async start() {
    await this.startPromise;
  }
}

export const appStarter = new AppStarter();
