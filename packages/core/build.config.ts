import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  declaration: true,
  entries: [
    "src/index",
    {
      builder: "mkdist",
      input: "src/runtime/",
      outDir: "dist/runtime/",
    },
    {
      builder: "mkdist",
      input: "src/preset/",
      outDir: "dist/preset/",
      declaration: false,
    },
  ],
});
