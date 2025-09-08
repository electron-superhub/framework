import { defineCommand } from "citty";
import { resolve, join } from "pathe";
import { writePackageJSON } from "pkg-types";

import { AppInfo } from "@esho/core/types";

import fs from "node:fs";

import { cwdArgs } from "./_shared";
import {
  logger,
  validateAppInfo,
  buildAppPackageJson,
  renderEshoConfig,
  renderLinuxAfterInstall,
  renderLinuxAfterRemove,
  renderWinNsisInstaller,
  buildElectronBuilderConfig,
} from "../utils";

export default defineCommand({
  meta: {
    name: "init",
    description: "initialize electron-superhub app project by app.json",
  },
  args: {
    ...cwdArgs,
  },
  async run(ctx) {
    const cwd = resolve(ctx.args.cwd || ".");

    const appJsonPath = join(cwd, "app.json");
    if (!fs.existsSync(appJsonPath)) {
      logger.error(`app.json not exists in current directory "${cwd}"`);
      process.exit(1); // cwd 目录下 没有找到 app.json 文件
    }

    const appJsonStr = await fs.promises.readFile(appJsonPath, "utf-8");
    const appInfo = JSON.parse(appJsonStr) as AppInfo;

    const result = validateAppInfo(appInfo);
    if (!result.success) {
      logger.error(`invalid app.json: `);
      logger.error(result.errorMsg);
      process.exit(1);
    }

    // #region check resources icons
    const resourcesPath = join(cwd, "resources");
    const iconPath = join(resourcesPath, "icon.ico");
    if (!fs.existsSync(iconPath)) {
      logger.error(
        `icon.ico not exists in resources directory "${resourcesPath}"`
      );
      process.exit(1);
    }

    const icnsPath = join(resourcesPath, "icon.icns");
    if (!fs.existsSync(icnsPath)) {
      logger.error(
        `icon.icns not exists in resources directory "${resourcesPath}"`
      );
      process.exit(1);
    }

    const trayIconsPath = join(resourcesPath, "tray", "icons");
    if (!fs.existsSync(trayIconsPath)) {
      logger.error(
        `tray icons not exists in resources directory "${resourcesPath}"`
      );
      process.exit(1);
    }
    // #endregion

    const appPackageJson = await buildAppPackageJson(appInfo);

    const appPackageJsonPath = join(cwd, "package.json");
    try {
      await writePackageJSON(appPackageJsonPath, appPackageJson);
    } catch (err) {
      logger.error(`write package.json failed: ${err}`);
      process.exit(1);
    }

    const eshoConfigPath = join(cwd, "esho.config.ts");
    const eshoConfigStr = renderEshoConfig(appInfo);
    try {
      await fs.promises.writeFile(eshoConfigPath, eshoConfigStr, "utf8");
    } catch (err) {
      logger.error(`write esho config file failed: ${err}`);
      process.exit(1);
    }

    // #region write installer shell scripts
    if (process.platform === "win32") {
      const winInstallerDirPath = join(cwd, "build/installer/win");
      const winNsisInstallerPath = join(
        cwd,
        "build/installer/win/nsis-installer.nsh"
      );
      const winNsisInstallerStr = renderWinNsisInstaller(appInfo);
      try {
        await fs.promises.mkdir(winInstallerDirPath, { recursive: true });

        await fs.promises.writeFile(
          winNsisInstallerPath,
          winNsisInstallerStr,
          "utf8"
        );
      } catch (err) {
        logger.error(`write win nsis-installer.nsh file failed: ${err}`);
        process.exit(1);
      }
    }

    if (process.platform === "linux") {
      const linuxInstallerDirPath = join(cwd, "build/installer/linux");
      const linuxAfterInstallPath = join(
        cwd,
        "build/installer/linux/after-install.sh"
      );
      const linuxAfterInstallStr = renderLinuxAfterInstall(appInfo);
      try {
        await fs.promises.mkdir(linuxInstallerDirPath, { recursive: true });

        await fs.promises.writeFile(
          linuxAfterInstallPath,
          linuxAfterInstallStr,
          "utf8"
        );
      } catch (err) {
        logger.error(`write linux after-install.sh file failed: ${err}`);
        process.exit(1);
      }

      const linuxAfterRemovePath = join(
        cwd,
        "build/installer/linux/after-remove.sh"
      );
      const linuxAfterRemoveStr = renderLinuxAfterRemove(appInfo);
      try {
        await fs.promises.writeFile(
          linuxAfterRemovePath,
          linuxAfterRemoveStr,
          "utf8"
        );
      } catch (err) {
        logger.error(`write linux after-remove.sh file failed: ${err}`);
        process.exit(1);
      }
    }
    // #endregion

    const electronBuilderConfigPath = join(cwd, "electron-builder.json");
    const electronBuilderConfigInfo = buildElectronBuilderConfig(appInfo);
    try {
      await fs.promises.writeFile(
        electronBuilderConfigPath,
        JSON.stringify(electronBuilderConfigInfo, null, 2),
        "utf8"
      );
    } catch (err) {
      logger.error(`write electron-builder.json file failed: ${err}`);
      process.exit(1);
    }

    logger.success(`electron-superhub app initialized`);
  },
});
