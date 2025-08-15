import { fileURLToPath } from "node:url";

export const pkgDir = fileURLToPath(new URL(".", import.meta.url));

export const runtimeDir = fileURLToPath(
  new URL("dist/runtime/", import.meta.url)
);

export const runtimeInlineDependencies = [
  "@electron/asar",
  "await-to-js",
  "dotenv",
  "env-paths",
  "got",
  "lowdb",
  "nanoid",
  "sift",
  "uuid",
];

export const runtimeExternalDependencies = ["semver"];

export const runtimeElectronExternalDependencies = [
  "electron",
  "electron-updater",
  "original-fs",
];
