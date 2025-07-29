import { Esho, RollupConfig } from "@esho/core/types";

export const getMainRollupConfig = async (
  esho: Esho
): Promise<RollupConfig> => {
  const { mainPreset } = await import("@esho/core/preset");

  return {
    input: mainPreset.entry,
    output: {
      dir: esho.options.outputDir,
      entryFileNames: mainPreset.outputFileName,
      format: "esm",
    },
  };
};

export const getPreloadRollupConfig = async (
  esho: Esho
): Promise<RollupConfig> => {
  const { preloadPreset } = await import("@esho/core/preset");

  return {
    input: preloadPreset.entry,
    output: {
      dir: esho.options.outputDir,
      entryFileNames: preloadPreset.outputFileName,
      format: "esm",
    },
  };
};
