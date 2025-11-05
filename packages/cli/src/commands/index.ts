import type { CommandDef } from "citty";

const _toCommandDef = (r: any) => (r.default || r) as Promise<CommandDef>;

export const commands = {
  packplugin: () => import("./packplugin").then(_toCommandDef),
  dev: () => import("./dev").then(_toCommandDef),
  build: () => import("./build").then(_toCommandDef),
  init: () => import("./init").then(_toCommandDef),
  prebuild: () => import("./prebuild").then(_toCommandDef),
};
