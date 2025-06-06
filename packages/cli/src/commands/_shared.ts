import type { ArgDef } from "citty";

export const cwdArgs = {
  cwd: {
    type: "string",
    description: "Specify the working directory",
    valueHint: "directory",
    default: ".",
  },
} satisfies Record<string, ArgDef>;
