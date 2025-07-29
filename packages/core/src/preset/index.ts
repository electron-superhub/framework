import { fileURLToPath } from "node:url";

import { EshoPreset } from "../types";

const defineEshoPreset = (preset: EshoPreset) => {
  if (preset.baseMetaUrl && preset.entry && preset.entry.startsWith(".")) {
    preset.entry = fileURLToPath(new URL(preset.entry, preset.baseMetaUrl));
  }

  preset.outputFileName = preset.outputFileName || "index.mjs";

  return {
    ...preset,
  } as EshoPreset;
};

export const mainPreset = defineEshoPreset({
  name: "main",
  entry: "./main",
  outputFileName: "main.mjs",
  baseMetaUrl: import.meta.url,
});

export const preloadPreset = defineEshoPreset({
  name: "preload",
  entry: "./preload",
  outputFileName: "preload.mjs",
  baseMetaUrl: import.meta.url,
});
