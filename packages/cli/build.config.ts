import { defineBuildConfig } from "unbuild";
import virtual from "@rollup/plugin-virtual";
import { resolve } from "pathe";

import { fileURLToPath } from "node:url";
import fs from "node:fs";

const templatesRootDir = fileURLToPath(new URL("templates", import.meta.url));

const templates = [
  {
    name: "esho-config",
    virtualName: "#virtual/templates/esho-config",
    relativePath: "esho.config.tpl.ts",
  },
  {
    name: "installer/linux/after-install",
    virtualName: "#virtual/templates/installer/linux/after-install",
    relativePath: "installer/linux/after-install.tpl.sh",
  },
  {
    name: "installer/linux/after-remove",
    virtualName: "#virtual/templates/installer/linux/after-remove",
    relativePath: "installer/linux/after-remove.tpl.sh",
  },
  {
    name: "installer/win/nsis-installer",
    virtualName: "#virtual/templates/installer/win/nsis-installer",
    relativePath: "installer/win/nsis-installer.tpl.nsh",
  },
];

const virtual_templates_plugins = templates.map((template) => {
  return virtual({
    [`${template.virtualName}`]: `export default ${JSON.stringify(
      fs.readFileSync(resolve(templatesRootDir, template.relativePath), "utf8")
    )}`,
  });
});

const rewrite_npmcli_config_definitions = {
  name: "rewrite-npmcli-config-definitions",
  renderChunk(code: string) {
    const target = "@npmcli/config/lib/definitions";
    const replacement = "@npmcli/config/lib/definitions/index.js";

    // 全局替换所有出现的导入/require/动态import
    const newCode = code.split(target).join(replacement);
    return { code: newCode, map: null };
  },
};

export default defineBuildConfig({
  name: "eshi",
  rollup: {
    inlineDependencies: true,
  },
  hooks: {
    "rollup:options": (ctx, options) => {
      options.plugins = [
        ...(options.plugins || []),
        ...virtual_templates_plugins,
        rewrite_npmcli_config_definitions,
      ];
    },
  },
});
