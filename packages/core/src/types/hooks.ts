import { Esho } from "./esho";
import { RollupConfig } from "./rollup";

export type HookResult = void | Promise<void>;

export interface EshoHooks {
  "build:before": (esho: Esho) => HookResult;
  "rollup:main": (esho: Esho, config: RollupConfig) => HookResult;
  "rollup:preload": (esho: Esho, config: RollupConfig) => HookResult;
  compiled: (esho: Esho) => HookResult;
  close: (esho: Esho) => HookResult;
}
