import { defineCommand } from "citty";

import superhubCliPkg from "../package.json" assert { type: "json" };
import { commands } from "./commands";
import { logger, setupGlobalConsole } from "./utils";

export const main = defineCommand({
  meta: {
    name: "eshi",
    version: superhubCliPkg.version,
    description: superhubCliPkg.description,
  },
  subCommands: commands,
  async setup(ctx) {
    const command = ctx.args._[0];
    logger.debug(`Running \`eshi ${command}\` command`);

    const dev = command === "dev";
    setupGlobalConsole({ dev });
  },
});
