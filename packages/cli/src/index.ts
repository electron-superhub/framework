import { EshoConfig } from "@esho/core/types";

declare global {
  const defineEshoConfig: (config: EshoConfig) => EshoConfig;
}

export { main } from "./main";
export { runMain } from "./run";
