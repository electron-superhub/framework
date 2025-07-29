import { resolve } from "pathe";

import type { EshoOptions } from "../../../types";
import { EshoDefaults } from "../defaults";

export function resolvePathOptions(options: EshoOptions) {
  options.rootDir = resolve(options.rootDir || EshoDefaults.rootDir!);

  options.outputDir = resolve(
    options.rootDir,
    options.outputDir || EshoDefaults.outputDir!
  );
}
