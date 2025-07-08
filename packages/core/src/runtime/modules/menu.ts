import { Menu } from "electron";

import { AppContext, AppModule } from "../../types";
import { AppModuleBase } from "../core";

class AppMenuManager extends AppModuleBase implements AppModule {
  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.disableApplicationMenu();
  }

  private disableApplicationMenu() {
    Menu.setApplicationMenu(null);
  }
}

export function manageMenu() {
  return new AppMenuManager();
}
