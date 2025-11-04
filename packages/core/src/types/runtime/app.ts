export interface AppMetaInfo {
  appId: string;
  name: string;
  productName: string;
  description: string;
  version: string;
  author: {
    name: string;
    email: string;
    url: string;
  };
  homepage: string;
  copyright: string;
}

export interface AppWindowOptions {
  prod_url: string;
  dev_url?: string;
}

export interface AppProtocolOptions {
  scheme: string;
}

export interface AppPublishOptions {
  base_url: string;
}

export interface AppModulePublishOptions extends AppPublishOptions {
  manifest_file: string;
}

export interface AppModuleFederationOptions {
  manifest_ttl: number; // seconds
}

export interface AppInfo extends AppMetaInfo {
  windows: {
    main: AppWindowOptions;
  };
  protocol: AppProtocolOptions;
  publish: AppPublishOptions;
  plugins: {
    publish: AppPublishOptions;
  };
  modules: {
    publish: AppModulePublishOptions;
    federation: AppModuleFederationOptions;
  };
}
