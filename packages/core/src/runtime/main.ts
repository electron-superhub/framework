import { appStarter } from "./core";
import {
  checkSingleInstance,
  createTray,
  handleDialog,
  handleFileOps,
  handleNotification,
  handlePluginsStarter,
  handlePluginsUpdater,
  handleProtocol,
  handleUpdater,
  initAppCore,
  initMainKVStorage,
  initRendererStorage,
  manageIpcRenderer,
  manageMenu,
  manageShortcutKeys,
  manageWindows,
  resolveAppPackage,
  resolveAppPaths,
  resolveProcessEnvironment,
} from "./modules";

export const resolveDefaultAppStarter = () => {
  return appStarter
    .attach(resolveProcessEnvironment())
    .attach(manageIpcRenderer())
    .attach(resolveAppPackage())
    .attach(resolveAppPaths())
    .attach(checkSingleInstance())
    .attach(initAppCore())
    .attach(handleProtocol())
    .whenAppReady()
    .attach(handleNotification())
    .attach(handleDialog())
    .attach(initMainKVStorage())
    .attach(initRendererStorage())
    .attach(handleFileOps())
    .attach(handlePluginsStarter())
    .attach(handleUpdater())
    .attach(handlePluginsUpdater())
    .attach(manageMenu())
    .attach(manageShortcutKeys())
    .attach(createTray())
    .attach(manageWindows());
};

export const startDefaultApp = () => resolveDefaultAppStarter().start();
