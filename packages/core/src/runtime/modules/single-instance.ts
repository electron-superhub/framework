import path from "node:path";

import { AppContext, AppModule } from "../../types";
import { AppModuleBase } from "../core";

class AppSingleInstance extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.setAppUserDataPath();

    this.checkSingleInstance(); //校验 单实例运行
  }

  private setAppUserDataPath() {
    const appDataPath = this.contextApp.getPath("appData");
    const packageInfo = this.runtimeContext.getAppPackageInfo();

    // userDataPath 默认为 appDataPath/app.Name，
    // 当设置 productName中文名 时 就会产生中文目录
    // 故修改 userDataPath 为 appDataPath/packageName
    this.contextApp.setPath(
      "userData",
      path.join(appDataPath, packageInfo.name)
    );
  }

  private checkSingleInstance() {
    if (!this.contextApp.requestSingleInstanceLock()) {
      this.contextApp.quit();
      process.exit(0);
    }
  }
}

export function checkSingleInstance() {
  return new AppSingleInstance();
}
