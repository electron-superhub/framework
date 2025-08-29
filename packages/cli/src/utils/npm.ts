import Config from "@npmcli/config";
import {
  definitions,
  shorthands,
  flatten,
} from "@npmcli/config/lib/definitions";
import { join, dirname } from "pathe";

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";

import { logger } from "./logger";

const execPromise = promisify(exec);
const requireFrom = createRequire(import.meta.url);

export async function loadNpmConfig(opts?: {
  cwd?: string;
  argv?: string[];
  env?: NodeJS.ProcessEnv;
}) {
  const globalPackagePath_npm = await resolveGlobalPackagePath("npm");
  if (!globalPackagePath_npm)
    throw new Error(`can't find global package "npm" path`);

  const config = new Config({
    definitions,
    shorthands,
    flatten,
    npmPath: globalPackagePath_npm,
    env: opts?.env ?? process.env,
    argv: opts?.argv ?? [],
    cwd: opts?.cwd ?? process.cwd(),
  });

  await config.load();

  return config;
}

async function resolveGlobalNodeModulesPath(): Promise<string | null> {
  // first try "npm root -g"
  try {
    const { stdout } = await execPromise("npm root -g");
    return stdout.trim();
  } catch (err) {
    logger.warn(
      `"npm root -g" resolve global node_modules path failed: ${err}`
    );
  }

  // fallback to "npm config get prefix"
  try {
    const { stdout } = await execPromise("npm config get prefix");
    const prefix = stdout.trim();

    const posixPath = join(prefix, "lib", "node_modules");
    const win32Path = join(prefix, "node_modules");

    return process.platform === "win32" ? win32Path : posixPath;
  } catch (err) {
    logger.warn(
      `"npm config get prefix" resolve global node_modules path failed: ${err}`
    );
  }

  return null;
}

async function resolveGlobalPackagePath(
  packageName: string
): Promise<string | null> {
  const globalNodeModulesPath = await resolveGlobalNodeModulesPath();
  if (!globalNodeModulesPath) {
    logger.error(`resolve global node_modules path failed`);
    return null;
  }

  try {
    const packageJson = requireFrom.resolve(`${packageName}/package.json`, {
      paths: [globalNodeModulesPath],
    });
    return dirname(packageJson);
  } catch (err) {
    logger.error(`resolve global package "${packageName}" path failed: ${err}`);
    return null;
  }
}
