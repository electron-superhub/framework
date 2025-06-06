import type { CommandDef } from "citty";

const _toCommandDef = (r: any) => (r.default || r) as Promise<CommandDef>;

export const commands = {
  packplugin: () => import("./packplugin").then(_toCommandDef),
};
