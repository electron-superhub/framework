import { defineCommand } from "citty";
import { resolve, join } from "pathe";
import { writePackageJSON } from "pkg-types";

import { AppInfo } from "@esho/core/types";

import fs from "node:fs";

import { cwdArgs } from "./_shared";
import { logger, validateAppInfo, buildAppPackageJson } from "../utils";

import eshoConfigTpl from "#virtual/templates/esho-config";

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

    const appPackageJson = buildAppPackageJson(appInfo);

    const appPackageJsonPath = join(cwd, "package.json");
    try {
      await writePackageJSON(appPackageJsonPath, appPackageJson);
    } catch (err) {
      logger.error(`write package.json failed: ${err}`);
      process.exit(1);
    }

    const eshoConfigPath = join(cwd, "esho.config.ts");
    try {
      await fs.promises.writeFile(eshoConfigPath, eshoConfigTpl, "utf8");
    } catch (err) {
      logger.error(`write esho config file failed: ${err}`);
      process.exit(1);
    }

    logger.info(`electron-superhub app initialized`);
  },
});
