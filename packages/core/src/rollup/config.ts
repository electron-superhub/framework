import type { Plugin } from "rollup";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { visualizer, PluginVisualizerOptions } from "rollup-plugin-visualizer";
import { dirname, normalize, resolve } from "pathe";

import { Esho, RollupConfig } from "@esho/core/types";
import {
  runtimeDir,
  runtimeInlineDependencies,
  runtimeExternalDependencies,
  runtimeElectronExternalDependencies,
} from "@esho/core/runtime/meta";
import { externals } from "./plugins/externals";

export const getMainRollupConfig = async (
  esho: Esho
): Promise<RollupConfig> => {
  const { mainPreset } = await import("@esho/core/preset");

  const normalizedRuntimeDir = normalize(runtimeDir);
  const chunkNamePrefixes = [[normalizedRuntimeDir, "esho"]] as const;

  const getChunkFilePath = function (id: string) {
    // Known path prefixes
    for (const [dir, name] of chunkNamePrefixes) {
      if (id.startsWith(dir)) {
        return `chunks/${name}/[name].mjs`;
      }
    }

    // Unknown path
    return `chunks/_/[name].mjs`;
  };

  const getChunkFileName = function (id: string): string | void {
    if (id.startsWith(normalizedRuntimeDir)) {
      return "esho";
    }
  };

  const rollupConfig = <RollupConfig>{
    input: mainPreset.entry,
    output: {
      dir: esho.options.outputDir,
      entryFileNames: mainPreset.outputFileName,
      format: "esm",
      chunkFileNames(chunk) {
        const lastModule = normalize(chunk.moduleIds.at(-1) || "");
        return getChunkFilePath(lastModule);
      },
      manualChunks(id) {
        const normalizedId = normalize(id);
        return getChunkFileName(normalizedId);
      },
      importAttributesKey: "with",
    },
  };

  const rollupPlugins: Plugin[] = [];
  rollupPlugins.push(
    alias({
      entries: {
        "@esho/core/runtime": runtimeDir,
      },
    })
  );
  rollupPlugins.push(
    externals({
      outDir: esho.options.outputDir,
      rootDir: esho.options.rootDir,
      inline: [
        "@esho/core/runtime",
        runtimeDir,
        dirname(mainPreset.entry),
        ...(esho.options.dev ? [] : runtimeInlineDependencies),
      ],
      external: [
        ...runtimeExternalDependencies,
        ...(esho.options.dev ? runtimeInlineDependencies : []),
      ],
      forceExternal: [...runtimeElectronExternalDependencies],
      traceOptions: {
        base: "/",
        processCwd: esho.options.rootDir,
        exportsOnly: true,
      },
    })
  );
  rollupPlugins.push(
    nodeResolve({
      preferBuiltins: true,
      rootDir: esho.options.rootDir,
      exportConditions: ["node", "import", "default"],
    })
  );
  rollupPlugins.push(
    commonjs({
      strictRequires: "auto",
      esmExternals: false,
      requireReturnsDefault: "auto",
    })
  );
  rollupPlugins.push(json());
  if (esho.options.analyze)
    rollupPlugins.push(
      visualizer(
        formatRollupVisualizerOptions(mainPreset.name, esho.options.analyze)
      )
    );
  rollupConfig.plugins = rollupPlugins;

  return rollupConfig;
};

export const getPreloadRollupConfig = async (
  esho: Esho
): Promise<RollupConfig> => {
  const { preloadPreset } = await import("@esho/core/preset");

  const rollupConfig = <RollupConfig>{
    input: preloadPreset.entry,
    output: {
      dir: esho.options.outputDir,
      entryFileNames: preloadPreset.outputFileName,
      format: "esm",
    },
  };

  const rollupPlugins: Plugin[] = [];
  rollupPlugins.push(
    alias({
      entries: {
        "@esho/core/runtime": runtimeDir,
      },
    })
  );
  rollupPlugins.push(
    externals({
      outDir: esho.options.outputDir,
      rootDir: esho.options.rootDir,
      inline: [
        "@esho/core/runtime",
        runtimeDir,
        dirname(preloadPreset.entry),
        ...runtimeInlineDependencies,
        ...runtimeExternalDependencies,
      ], // preload 除了electron以外 其它依赖全部内联
      forceExternal: [...runtimeElectronExternalDependencies],
      trace: false, // preload 不需要 跟踪外部依赖
    })
  );
  rollupPlugins.push(
    nodeResolve({
      preferBuiltins: true,
      rootDir: esho.options.rootDir,
      exportConditions: ["node", "import", "default"],
    })
  );
  if (esho.options.analyze)
    rollupPlugins.push(
      visualizer(
        formatRollupVisualizerOptions(preloadPreset.name, esho.options.analyze)
      )
    );
  rollupConfig.plugins = rollupPlugins;

  return rollupConfig;
};

function formatRollupVisualizerOptions(
  presetName: string,
  options: PluginVisualizerOptions
): PluginVisualizerOptions {
  const newOptions = {
    ...options,
    filename: options.filename || "{presetName}-stats.html",
    title: options.title || "{presetName} Rollup Visualizer",
  };

  newOptions.filename = resolve(
    "./.esho/output/",
    newOptions.filename.replace("{presetName}", presetName)
  );
  newOptions.title = newOptions.title.replace("{presetName}", presetName);

  return newOptions;
}
