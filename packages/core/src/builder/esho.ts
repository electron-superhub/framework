import { consola } from "consola";
import { createHooks } from "hookable";

import { Esho, EshoConfig, EshoOptions } from "../types";
import { loadOptions } from "./config/loader";

export async function createEsho(config: EshoConfig = {}) {
  const options: EshoOptions = await loadOptions(config);

  const esho: Esho = {
    options,
    hooks: createHooks(),
    logger: consola.withTag("esho"),
    close: () => esho.hooks.callHook("close", esho),
  };

  // Logger
  esho.logger.level = esho.options.logLevel;

  // Hooks
  esho.hooks.addHooks(esho.options.hooks);

  return esho;
}
