import { AppInfo } from "@esho/core/types";

export function buildElectronBuilderConfig(appInfo: AppInfo) {
  const config = {
    appId: appInfo.appId,
    productName: appInfo.productName,
    copyright: appInfo.copyright,
    asar: false,
    directories: {
      output: "release",
      buildResources: "resources",
    },
    files: [
      {
        from: ".",
        filter: ["dist", "resources", "package.json", "app.json"],
      },
    ],
    protocols: {
      name: appInfo.name,
      schemes: [appInfo.protocol.scheme],
    },
    publish: {
      provider: "generic",
      url: appInfo.publish.base_url,
    },
  } as Record<string, any>;

  if (process.platform === "win32") {
    config.nsis = {
      deleteAppDataOnUninstall: true,
      include: "build/installer/win/nsis-installer.nsh",
    };
  }

  if (process.platform === "linux") {
    config.linux = {
      artifactName: "${productName}_${version}_${platform}_${arch}.${ext}",
      target: [
        {
          target: "deb",
          arch: [process.arch],
        },
      ],
      category: "Office;Utility",
      desktop: {
        StartupWMClass: appInfo.name,
      },
    };
    config.deb = {
      afterInstall: "build/installer/linux/after-install.sh",
      afterRemove: "build/installer/linux/after-remove.sh",
    };
  }

  return config;
}
