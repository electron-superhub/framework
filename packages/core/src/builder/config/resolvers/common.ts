import type { EshoOptions } from "../../../types";
import { EshoDefaults } from "../defaults";

export function resolveCommonOptions(options: EshoOptions) {
  options.logLevel = options.logLevel || EshoDefaults.logLevel!;

  options.dev = options.dev || EshoDefaults.dev!;

  options.hooks = options.hooks || EshoDefaults.hooks!;
}
