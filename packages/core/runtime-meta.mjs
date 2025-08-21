import { fileURLToPath } from "node:url";

export const pkgDir = fileURLToPath(new URL(".", import.meta.url));

export const runtimeDir = fileURLToPath(
  new URL("dist/runtime/", import.meta.url)
);

export const runtimeInlineDependencies = [
  "await-to-js",
  "dotenv",
  "env-paths",
  "lowdb",
  "nanoid",
  "sift",
  "uuid",
];

export const runtimeExternalDependencies = ["@electron/asar", "got", "semver"];

export const runtimeElectronExternalDependencies = [
  "electron",
  "electron-updater",
  "original-fs",
];
