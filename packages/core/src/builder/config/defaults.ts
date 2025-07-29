import { isTest } from "std-env";

import type { EshoConfig } from "../../types";

export const EshoDefaults: EshoConfig = {
  logLevel: isTest ? 1 : 3,

  dev: false,

  rootDir: ".",
  outputDir: "dist",

  hooks: {},
};
