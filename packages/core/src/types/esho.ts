import { ConsolaInstance } from "consola";
import { Hookable } from "hookable";

import { EshoOptions } from "./config";
import { EshoHooks } from "./hooks";

export interface Esho {
  options: EshoOptions;
  hooks: Hookable<EshoHooks>;
  logger: ConsolaInstance;
  close: () => Promise<void>;
}
