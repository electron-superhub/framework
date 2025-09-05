import type { PackageJson } from "pkg-types";
import pacote from "pacote";

import { AppInfo } from "@esho/core/types";

import { loadNpmConfig } from "./npm";
import { logger } from "./logger";

const packageDevDependencies = ["electron", "electron-builder", "@esho/cli"];
const packageDependencies = ["electron-updater"];

const packageScripts = {
  "esho:build": "eshi build",
  "electron:start": "pnpm esho:build && electron .",
};

export async function buildAppPackageJson(
  appInfo: AppInfo
): Promise<PackageJson> {
  const packageJson = <PackageJson>{
    private: true,
    name: appInfo.name,
    productName: appInfo.productName,
    description: appInfo.description,
    version: appInfo.version,
    author: appInfo.author,
    homepage: appInfo.homepage,
    type: "module",
    main: "./dist/electron/main.mjs",
  };

  // pnpm v10+ onlyBuiltDependencies to allow electron
  packageJson.pnpm = {
    onlyBuiltDependencies: ["electron"],
  };

  packageJson.dependencies = await buildAppPackageDependencyRecord(
    packageDependencies
  );
  packageJson.devDependencies = await buildAppPackageDependencyRecord(
    packageDevDependencies
  );

  packageJson.scripts = packageScripts;
  if (process.platform === "win32") {
    packageJson.scripts["electron:build"] =
      "pnpm esho:build && electron-builder --win";
  }
  if (process.platform === "linux") {
    packageJson.scripts["electron:build"] =
      "pnpm esho:build && electron-builder --linux";
    packageJson.scripts["electron:build:arm64"] =
      "pnpm esho:build && electron-builder --linux --arm64";
  }

  return packageJson;
}

export async function resolvePackageManifest(packageName: string) {
  const opts = await buildPacoteOptionsByNpmConfig();

  return pacote.manifest(packageName, opts);
}

async function buildAppPackageDependencyRecord(dependencyPkgNames: string[]) {
  const pacoteOpts = await buildPacoteOptionsByNpmConfig();

  const dependencyPkgs = await Promise.all(
    dependencyPkgNames.map((depPkgName) =>
      pacote
        .manifest(depPkgName, pacoteOpts)
        .then((depPkgManifest) => ({
          name: depPkgManifest.name,
          version: `^${depPkgManifest.version}`,
        }))
        .catch((err) => {
          logger.warn(
            `resolve package "${depPkgName}" manifest failed: ${err}`
          );
          return {
            name: depPkgName,
            version: "latest",
          };
        })
    )
  );

  return dependencyPkgs.reduce(
    (depPkgRecord, depPkg) => ({
      ...depPkgRecord,
      [depPkg.name]: depPkg.version,
    }),
    {} as Record<string, string>
  );
}

async function buildPacoteOptionsByNpmConfig() {
  let npmConfig;
  try {
    npmConfig = await loadNpmConfig();
  } catch (err) {
    return {};
  }

  const registry = npmConfig.get("registry") || "https://registry.npmjs.org/";

  const registryHost = new URL(registry).host;
  const registryAuthKey = `//${registryHost}/:_authToken`;
  let registryAuthToken: string = npmConfig.get(registryAuthKey) || "";
  if (registryAuthToken) {
    registryAuthToken = registryAuthToken.replace(/^"|"$/g, "");
  }

  return {
    registry,
    [registryAuthKey]: registryAuthToken,
  };
}
