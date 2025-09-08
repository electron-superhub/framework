import { defineCommand } from "citty";
import { resolve } from "pathe";
import { build, createEsho } from "@esho/core";

import { cwdArgs } from "./_shared";
import { logger } from "../utils";

export default defineCommand({
  meta: {
    name: "dev",
    description: "start electron-superhub app for development",
  },
  args: {
    ...cwdArgs,
  },
  async run(ctx) {
    const rootDir = resolve(ctx.args.cwd || ".");

    const esho = await createEsho({ rootDir, dev: true });
    await build(esho);
    await esho.close();

    logger.success(`electron-superhub app development started`);
  },
});
