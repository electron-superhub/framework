import { defineCommand } from "citty";
import { resolve, join } from "pathe";
import { AppPluginInfoBase } from "@esho/core/types";
import { createPackage } from "@electron/asar";

import fs from "node:fs";

import { cwdArgs } from "./_shared";
import { hashFile, logger } from "../utils";

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
    const cwd = resolve(ctx.args.cwd || ".");
    const packDir = resolve(cwd, ctx.args.packDir || "dist");
    const outputDir = resolve(cwd, ctx.args.outputDir || "release");

    if (!fs.existsSync(packDir)) {
      logger.error(`to pack directory "${packDir}" not exists`);
      process.exit(1);
    }

    const pluginJsonPath = join(packDir, "plugin.json");
    if (!fs.existsSync(pluginJsonPath)) {
      logger.error(`plugin.json not exists in to pack directory "${packDir}"`);
      process.exit(1); // packDir 目录下 没有找到 plugin.json 文件
    }

    const pluginJsonStr = await fs.promises.readFile(pluginJsonPath, "utf-8");
    const pluginInfo = JSON.parse(pluginJsonStr) as AppPluginInfoBase;

    if (pluginInfo.name && pluginInfo.version) {
      logger.info(
        `packing plugin "${pluginInfo.name}@${pluginInfo.version}"...`
      );
    } else {
      logger.error(`invalid name or version in plugin.json`);
      process.exit(1); // plugin.json 中缺少 name 或者 version 字段
    }

    const targetPlatformArch = resolveArchiveTargetPlatformArch(
      ctx.args.universal,
      ctx.args.platform,
      ctx.args.arch
    );
    logger.info(`target platform arch: ${targetPlatformArch}`);

    const asarArchiveFileName = formatPluginAsarArchiveFileName(
      pluginInfo,
      targetPlatformArch
    );
    const outputAsarArchivePath = join(outputDir, asarArchiveFileName);

    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      await createPackage(packDir, outputAsarArchivePath);
    } catch (err) {
      logger.error(`pack plugin asar archive error: ${err}`);
      process.exit(1);
    }

    logger.success(
      `plugin packed, output asar archive: ${outputAsarArchivePath}`
    );

    const releaseInfoFileName =
      formatPluginReleaseInfoFileName(targetPlatformArch);
    const releaseInfoFilePath = join(outputDir, releaseInfoFileName);

    try {
      const outputAsarArchiveStats = await fs.promises.stat(
        outputAsarArchivePath
      );
      const outputAsarArchiveHash = await hashFile(outputAsarArchivePath);
      const pluginReleaseInfo = {
        pluginId: pluginInfo.pluginId,
        name: pluginInfo.name,
        productName: pluginInfo.productName,
        description: pluginInfo.description,
        version: pluginInfo.version,
        url: asarArchiveFileName,
        sha512: outputAsarArchiveHash,
        size: outputAsarArchiveStats.size,
        releaseDate: new Date().toISOString(),
      };

      await fs.promises.writeFile(
        releaseInfoFilePath,
        JSON.stringify(pluginReleaseInfo, null, 2),
        "utf8"
      );
    } catch (err) {
      logger.error(`output plugin release info error: ${err}`);
      process.exit(1);
    }

    logger.success(`output plugin release info: ${releaseInfoFilePath}`);
  },
});

function formatPluginAsarArchiveFileName(
  pluginInfo: AppPluginInfoBase,
  targetPlatformArch: string
) {
  const nameVersion = `${pluginInfo.name}-v${pluginInfo.version}`;

  return `${nameVersion}-${targetPlatformArch}.asar`;
}

function resolveArchiveTargetPlatformArch(
  universal: boolean,
  platform: string,
  arch: string
) {
  if (universal) {
    return "universal";
  }

  platform = platform || process.platform;
  arch = arch || process.arch;

  return `${platform}-${arch}`;
}

function formatPluginReleaseInfoFileName(targetPlatformArch: string) {
  if (targetPlatformArch === "universal") {
    return "latest-universal.json";
  }

  const [platform, arch] = targetPlatformArch.split("-");

  const resolveReleasePlatformSuffix = (platform: string) => {
    switch (platform) {
      case "win32":
        return "";
      case "darwin":
        return "-mac";
      case "linux":
        return "-linux";
      default:
        return `-${platform}`;
    }
  };

  const resolveReleaseArchSuffix = (arch: string) => {
    switch (arch) {
      case "x64":
        return "";
      case "arm64":
        return "-arm64";
      default:
        return `-${arch}`;
    }
  };

  return `latest${resolveReleasePlatformSuffix(
    platform
  )}${resolveReleaseArchSuffix(arch)}.json`;
}
