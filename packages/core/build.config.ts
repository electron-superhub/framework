import { fileURLToPath } from "node:url";
import { resolve } from "pathe";
import { defineBuildConfig } from "unbuild";

const srcDir = fileURLToPath(new URL("src", import.meta.url));

export const subpaths = [
  "builder",
  "config",
  "preset",
  "rollup",
  "runtime",
  "types",
];

export default defineBuildConfig({
  declaration: true,
  name: "esho",
  entries: [
    {
      builder: "mkdist",
      input: "src/preset/",
      outDir: "dist/preset/",
    },
    {
      builder: "mkdist",
      input: "src/runtime/",
      outDir: "dist/runtime/",
    },
    "src/builder/index",
    "src/config/index",
    "src/rollup/index",
    "src/types/index",
  ],
  externals: [
    "@esho/core",
    ...subpaths.map((subpath) => `@esho/core/${subpath}`),
  ],
  stubOptions: {
    jiti: {
      alias: {
        ...Object.fromEntries(
          subpaths.map((subpath) => [
            `@esho/core/${subpath}`,
            resolve(srcDir, `${subpath}/index.ts`),
          ])
        ),
      },
    },
  },
});
