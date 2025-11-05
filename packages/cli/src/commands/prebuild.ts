import { z } from "zod";
import { defineCommand } from "citty";
import { resolve, join } from "pathe";
import YAML, { Document, YAMLMap, isMap } from "yaml";

import fs from "node:fs";

import { cwdArgs } from "./_shared";
import {
  logger,
  renderLinuxAfterInstall,
  renderLinuxAfterRemove,
  renderWinNsisInstaller,
  txtSuccess,
} from "../utils";
import type { ActResult } from "../utils";

interface AppPackageWithOptions {
  name: string;
  productName: string;
  description: string;
  version: string;
  appOptions: {
    appId: string;
    protocol: {
      scheme: string;
    };
    publish: {
      base_url: string;
    };
    build: {
      nsis: {
        change_install_dir: boolean;
        validate_install_dir: boolean;
      };
    };
  };
}

const packageWithOptionsSchema = z.object({
  name: z.string().meta({ description: "应用英文名称" }),
  productName: z.string().meta({ description: "应用中文名称" }),
  description: z.string().meta({ description: "应用描述" }),
  version: z.string().meta({ description: "版本号" }),
  appOptions: z.object({
    appId: z.string().meta({ description: "应用Id" }),
    protocol: z.object({
      scheme: z.string().meta({ description: "唤醒协议" }),
    }),
    publish: z.object({
      base_url: z.string().meta({ description: "发布base地址" }),
    }),
    build: z.object({
      nsis: z.object({
        change_install_dir: z
          .boolean()
          .meta({ description: "是否修改安装目录" }),
        validate_install_dir: z
          .boolean()
          .meta({ description: "是否校验安装目录" }),
      }),
    }),
  }),
});

const validatePackageWithOptions = function (
  packageWithOptions: AppPackageWithOptions
): ActResult {
  const result = packageWithOptionsSchema.safeParse(packageWithOptions);

  if (result.success) return { success: true };

  return {
    success: false,
    errorMsg: z.prettifyError(result.error),
  };
};

const convertToSimpleAppInfo = function (
  packageWithOptions: AppPackageWithOptions
) {
  const { appOptions, ...packageMeta } = packageWithOptions;
  const { build, ...restOptions } = appOptions;

  return { ...packageMeta, ...restOptions };
};

const resolveMapFromYamlDocOrMap = function (
  yamlDocOrMap: Document | YAMLMap,
  key: string
): YAMLMap {
  const keyItem = yamlDocOrMap.get(key);

  if (isMap(keyItem)) return keyItem;

  const newKeyItem = new YAMLMap();
  yamlDocOrMap.set(key, newKeyItem);

  return newKeyItem;
};

export default defineCommand({
  meta: {
    name: "prebuild",
    description: "patch electron-builder config by package.json app options",
  },
  args: {
    ...cwdArgs,
  },
  async run(ctx) {
    const cwd = resolve(ctx.args.cwd || ".");

    const packageJsonPath = join(cwd, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      logger.error(`package.json not exists in current directory "${cwd}"`);
      process.exit(1); // cwd 目录下 没有找到 package.json 文件
    }

    const packageJsonStr = await fs.promises.readFile(packageJsonPath, "utf8");
    const packageWithOptions = JSON.parse(
      packageJsonStr
    ) as AppPackageWithOptions;

    const result = validatePackageWithOptions(packageWithOptions);
    if (!result.success) {
      logger.error(`invalid package.json: `);
      logger.error(result.errorMsg);
      process.exit(1);
    }

    const simpleAppInfo = convertToSimpleAppInfo(packageWithOptions);
    const buildNsisOptions = packageWithOptions.appOptions.build.nsis;

    // #region write installer shell scripts
    const winInstallerDirPath = join(cwd, "build/installer/win");
    const winNsisInstallerPath = join(
      cwd,
      "build/installer/win/nsis-installer.nsh"
    );
    const winNsisInstallerStr = renderWinNsisInstaller(
      simpleAppInfo,
      buildNsisOptions.change_install_dir &&
        buildNsisOptions.validate_install_dir
    );
    try {
      if (!fs.existsSync(winInstallerDirPath)) {
        await fs.promises.mkdir(winInstallerDirPath, { recursive: true });
      }

      await fs.promises.writeFile(
        winNsisInstallerPath,
        winNsisInstallerStr,
        "utf8"
      );
    } catch (err) {
      logger.error(`write win nsis-installer.nsh file failed: ${err}`);
      process.exit(1);
    }

    const linuxInstallerDirPath = join(cwd, "build/installer/linux");
    const linuxAfterInstallPath = join(
      cwd,
      "build/installer/linux/after-install.tpl"
    );
    const linuxAfterInstallStr = renderLinuxAfterInstall(simpleAppInfo);
    try {
      if (!fs.existsSync(linuxInstallerDirPath)) {
        await fs.promises.mkdir(linuxInstallerDirPath, { recursive: true });
      }

      await fs.promises.writeFile(
        linuxAfterInstallPath,
        linuxAfterInstallStr,
        "utf8"
      );
    } catch (err) {
      logger.error(`write linux after-install.tpl file failed: ${err}`);
      process.exit(1);
    }

    const linuxAfterRemovePath = join(
      cwd,
      "build/installer/linux/after-remove.tpl"
    );
    const linuxAfterRemoveStr = renderLinuxAfterRemove(simpleAppInfo);
    try {
      await fs.promises.writeFile(
        linuxAfterRemovePath,
        linuxAfterRemoveStr,
        "utf8"
      );
    } catch (err) {
      logger.error(`write linux after-remove.tpl file failed: ${err}`);
      process.exit(1);
    }

    logger.success(
      txtSuccess("prebuild write installer shell scripts succeeded")
    );
    // #endregion

    // #region patch electron-builder.yml
    const electronBuilderYmlPath = join(cwd, "electron-builder.yml");
    if (!fs.existsSync(electronBuilderYmlPath)) {
      logger.error(
        `electron-builder.yml not exists in current directory "${cwd}"`
      );
      process.exit(1);
    }

    const electronBuilderYmlStr = await fs.promises.readFile(
      electronBuilderYmlPath,
      "utf8"
    );
    const electronBuilderYmlDoc = YAML.parseDocument(electronBuilderYmlStr);

    electronBuilderYmlDoc.set("appId", simpleAppInfo.appId);
    electronBuilderYmlDoc.set("productName", simpleAppInfo.productName);

    const ymlDoc_protocols = resolveMapFromYamlDocOrMap(
      electronBuilderYmlDoc,
      "protocols"
    );
    ymlDoc_protocols.set("name", simpleAppInfo.name);
    ymlDoc_protocols.set("schemes", [simpleAppInfo.protocol.scheme]);

    const ymlDoc_publish = resolveMapFromYamlDocOrMap(
      electronBuilderYmlDoc,
      "publish"
    );
    ymlDoc_publish.set("provider", "generic");
    ymlDoc_publish.set("url", simpleAppInfo.publish.base_url);

    const ymlDoc_nsis = resolveMapFromYamlDocOrMap(
      electronBuilderYmlDoc,
      "nsis"
    );
    if (buildNsisOptions.change_install_dir) {
      ymlDoc_nsis.set("oneClick", false);
      ymlDoc_nsis.set("allowToChangeInstallationDirectory", true);
    }

    const ymlDoc_linux = resolveMapFromYamlDocOrMap(
      electronBuilderYmlDoc,
      "linux"
    );
    const ymlDoc_linux_desktop = resolveMapFromYamlDocOrMap(
      ymlDoc_linux,
      "desktop"
    );
    ymlDoc_linux_desktop.set("StartupWMClass", simpleAppInfo.name);

    try {
      await fs.promises.writeFile(
        electronBuilderYmlPath,
        YAML.stringify(electronBuilderYmlDoc),
        "utf8"
      );
    } catch (err) {
      logger.error(`write electron-builder.yml file failed: ${err}`);
      process.exit(1);
    }

    logger.success(txtSuccess("prebuild patch electron-builder.yml succeeded"));
    // #endregion
  },
});
