import type { EshoConfig } from "./config";

declare global {
  const defineEshoConfig: (config: EshoConfig) => EshoConfig;
}

export type {};
