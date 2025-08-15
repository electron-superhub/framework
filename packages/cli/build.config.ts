import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  name: "eshi",
  rollup: {
    inlineDependencies: true,
  },
});
