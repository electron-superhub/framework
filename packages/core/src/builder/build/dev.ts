import { Esho } from "../../types";

import { prepare } from "./utils/prepare";
import { rollupOutputMain, rollupOutputPreload } from "./utils/rollup";

export async function buildDevelopment(esho: Esho) {
  await prepare(esho);

  await rollupOutputMain(esho);
  await rollupOutputPreload(esho);

  await esho.hooks.callHook("compiled", esho);
}
