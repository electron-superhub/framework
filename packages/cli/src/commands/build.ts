import { defineCommand } from "citty";
import { resolve } from "pathe";
import { build, createEsho } from "@esho/core";

import { cwdArgs } from "./_shared";
import { logger, txtSuccess } from "../utils";

export default defineCommand({
  meta: {
    name: "build",
    description: "build electron-superhub app for production",
  },
  args: {
    ...cwdArgs,
  },
  async run(ctx) {
    const rootDir = resolve(ctx.args.cwd || ".");

    const esho = await createEsho({ rootDir, dev: false });
    await build(esho);
    await esho.close();

    logger.success(txtSuccess("electron-superhub app production built"));
  },
});
