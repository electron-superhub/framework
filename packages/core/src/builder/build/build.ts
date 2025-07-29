import { Esho } from "../../types";
import { buildDevelopment } from "./dev";
import { buildProduction } from "./prod";

export async function build(esho: Esho) {
  await esho.hooks.callHook("build:before", esho);

  return esho.options.dev ? buildDevelopment(esho) : buildProduction(esho);
}
