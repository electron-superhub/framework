import type { ResolvedConfig } from "c12";
import type { LogLevel } from "consola";
import type { NestedHooks } from "hookable";
import type { PluginVisualizerOptions } from "rollup-plugin-visualizer";

import { EshoHooks } from "./hooks";

export interface EshoOptions {
  _config: EshoConfig;
  _c12: ResolvedConfig<EshoConfig>;

  logLevel: LogLevel;

  dev: boolean;

  rootDir: string;
  outputDir: string;

  hooks: NestedHooks<EshoHooks>;

  // Rollup
  analyze: false | PluginVisualizerOptions;
}

export interface EshoConfig
  extends Partial<Omit<EshoOptions, "_config" | "_c12">> {}
