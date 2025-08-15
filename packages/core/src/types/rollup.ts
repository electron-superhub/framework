import type {
  InputOptions as RollupInputOptions,
  OutputOptions as RollupOutputOptions,
} from "rollup";
import type { NodeFileTraceOptions } from "@vercel/nft";

export type RollupConfig = RollupInputOptions & {
  output: RollupOutputOptions;
};

export interface NodeExternalsOptions {
  inline?: Array<string>;
  external?: Array<string>;
  forceExternal?: Array<string>;
  rootDir?: string;
  outDir: string;
  trace?: boolean;
  traceOptions?: NodeFileTraceOptions;
}
