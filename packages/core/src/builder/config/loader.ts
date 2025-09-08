import { loadConfig } from "c12";

import type { EshoConfig, EshoOptions } from "../../types";
import { EshoDefaults } from "./defaults";

import { resolveCommonOptions } from "./resolvers/common";
import { resolvePathOptions } from "./resolvers/paths";

const configResolvers = [resolveCommonOptions, resolvePathOptions] as const;

export async function loadOptions(configOverrides: EshoConfig = {}) {
  const options = await loadUserConfig(configOverrides);

  for (const resolver of configResolvers) {
    resolver(options);
  }

  return options;
}

async function loadUserConfig(configOverrides: EshoConfig = {}) {
  // @ts-ignore
  globalThis.defineEshoConfig = globalThis.defineEshoConfig || ((c) => c);

  const loadedConfig = await loadConfig<EshoConfig>({
    name: "esho",
    cwd: configOverrides.rootDir,
    dotenv: configOverrides.dev,
    defaults: EshoDefaults,
    overrides: {
      ...configOverrides,
    },
    extend: { extendKey: "extends" },
  });

  const options = loadedConfig.config as EshoOptions;
  options._config = configOverrides;
  options._c12 = loadedConfig;

  return options;
}
