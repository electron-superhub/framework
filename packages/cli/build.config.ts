import { defineBuildConfig } from "unbuild";
import virtual from "@rollup/plugin-virtual";
import { join } from "pathe";

import { fileURLToPath } from "node:url";
import fs from "node:fs";

const templatesDir = fileURLToPath(new URL("templates", import.meta.url));

const virtual_templates_eshoConfig = virtual({
  "#virtual/templates/esho-config": `export default ${JSON.stringify(
    fs.readFileSync(join(templatesDir, "esho.config.tpl.ts"), "utf8")
  )}`,
});

export default defineBuildConfig({
  name: "eshi",
  rollup: {
    inlineDependencies: true,
  },
  hooks: {
    "rollup:options": (ctx, options) => {
      options.plugins = [
        ...(options.plugins || []),
        virtual_templates_eshoConfig,
      ];
    },
  },
});
