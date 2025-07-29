import fsp from "node:fs/promises";

import { Esho } from "../../../types";

export async function prepare(esho: Esho) {
  await prepareDir(esho.options.outputDir);
}

function prepareDir(dir: string) {
  return fsp
    .rm(dir, { recursive: true, force: true })
    .then(() => fsp.mkdir(dir, { recursive: true }));
}
