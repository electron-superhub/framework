import { defineCommand } from "citty";
import { resolve, join } from "pathe";
import { AppPluginInfoBase } from "@electron-superhub/core";

import fs from "node:fs";

import { cwdArgs } from "./_shared";
import { logger } from "../utils";

export default defineCommand({
  meta: {
    name: "packplugin",
    description:
      "pack to plugin asar archive for running in electron-superhub app",
  },
  args: {
    ...cwdArgs,
    packDir: {
      type: "positional",
      description: "Specify the directory to pack asar archive",
      valueHint: "to pack directory",
      default: "dist",
    },
    outputDir: {
      type: "positional",
      description: "Specify the directory to output asar archive",
      valueHint: "asar archive output directory",
      default: "release",
    },
    platform: {
      type: "string",
      alias: "p",
      description: "Specify target platform of output asar archive",
      valueHint: "platform",
    },
    arch: {
      type: "string",
      alias: "a",
      description: "Specify target arch of output asar archive",
      valueHint: "arch",
    },
    universal: {
      type: "boolean",
      alias: "u",
      description: "Specify output asar archive is universal",
    },
  },
  async run(ctx) {
    const cwd = resolve(ctx.args.cwd);
    const packDir = resolve(cwd, ctx.args.packDir);
    const outputDir = resolve(cwd, ctx.args.outputDir);

    if (!fs.existsSync(packDir)) {
      logger.error(`to pack directory "${packDir}" not exists!`);
      process.exit(1);
    }

    const pluginJsonPath = join(packDir, "plugin.json");
    if (!fs.existsSync(pluginJsonPath)) {
      logger.error(`plugin.json not exists in to pack directory "${packDir}"!`);
      process.exit(1);  // packDir 目录下 没有找到 plugin.json 文件
    }

    const pluginJsonStr = await fs.promises.readFile(pluginJsonPath, "utf-8");
    const pluginInfo = JSON.parse(pluginJsonStr) as AppPluginInfoBase;

    if (pluginInfo.name && pluginInfo.version) {
      logger.info(
        `Packing plugin "${pluginInfo.name}@${pluginInfo.version}"...`
      );
    } else {
      logger.error(`invalid name or version in plugin.json!`);
      process.exit(1);  // plugin.json 中缺少 name 或者 version 字段
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  },
});
