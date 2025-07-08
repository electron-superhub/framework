import path from "node:path";

import { AppContext } from "../../../types";
import { AppModuleBase } from "../../core";
import { LowStorage, LowKVStorage } from "../../storage";

export abstract class AppStorageBase extends AppModuleBase {
  protected storagesPath!: string;

  protected load(context: AppContext) {
    super.load(context);

    this.storagesPath = this.resolveStoragesPath();
  }

  protected resolveStoragesPath() {
    const appDataPath = this.runtimeContext.getAppPathsData();
    return path.join(appDataPath, "storages");
  }

  protected resolveStorageDbPath(dbName: string = "default") {
    return path.join(this.storagesPath, `${dbName}db`);
  }

  protected initStorageDb(dbName: string = "default") {
    const storageDbPath = this.resolveStorageDbPath(dbName);
    return new LowStorage(storageDbPath);
  }

  protected resolveStorageKVPath(kvName: string = "default") {
    return path.join(this.storagesPath, `${kvName}kv`);
  }

  protected initStorageKV(kvName: string = "default") {
    const storageKVPath = this.resolveStorageKVPath(kvName);
    return new LowKVStorage(storageKVPath);
  }
}
