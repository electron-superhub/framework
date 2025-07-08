import { AppContext, AppModule } from "../../../types";
import { LowKVStorage } from "../../storage";
import { AppStorageBase } from "./storage-base";
import { registerIpcMainEvent } from "../../core";

const ipcMainEvents_mainKVStorage = {
  app_storage_kv_hasItem: "app:storage:kv:has-item",
  app_storage_kv_getItem: "app:storage:kv:get-item",
  app_storage_kv_setItem: "app:storage:kv:set-item",
  app_storage_kv_removeItem: "app:storage:kv:remove-item",
  app_storage_kv_getMeta: "app:storage:kv:get-meta",
  app_storage_kv_setMeta: "app:storage:kv:set-meta",
  app_storage_kv_removeMeta: "app:storage:kv:remove-meta",
  app_storage_kv_listNamespaces: "app:storage:kv:list-namespaces",
  app_storage_kv_namespace_getKeys: "app:storage:kv:namespace:get-keys",
  app_storage_kv_namespace_getCount: "app:storage:kv:namespace:get-count",
  app_storage_kv_namespace_clear: "app:storage:kv:namespace:clear",
} as const;

type IpcMainEvents_mainKVStorage = typeof ipcMainEvents_mainKVStorage;

declare module "../../core" {
  interface IpcMainEvents extends IpcMainEvents_mainKVStorage {}
}

const ipcMainRendererEvents_mainKVStorage = {
  on: {
    app_storage_kv_error: "renderer:on:app:storage:kv:error",
  },
  send: {
    app_storage_kv_setItem: ipcMainEvents_mainKVStorage.app_storage_kv_setItem,
    app_storage_kv_removeItem:
      ipcMainEvents_mainKVStorage.app_storage_kv_removeItem,
    app_storage_kv_setMeta: ipcMainEvents_mainKVStorage.app_storage_kv_setMeta,
    app_storage_kv_removeMeta:
      ipcMainEvents_mainKVStorage.app_storage_kv_removeMeta,
    app_storage_kv_namespace_clear:
      ipcMainEvents_mainKVStorage.app_storage_kv_namespace_clear,
  },
  invoke: {
    app_storage_kv_hasItem: ipcMainEvents_mainKVStorage.app_storage_kv_hasItem,
    app_storage_kv_getItem: ipcMainEvents_mainKVStorage.app_storage_kv_getItem,
    app_storage_kv_getMeta: ipcMainEvents_mainKVStorage.app_storage_kv_getMeta,
    app_storage_kv_listNamespaces:
      ipcMainEvents_mainKVStorage.app_storage_kv_listNamespaces,
    app_storage_kv_namespace_getKeys:
      ipcMainEvents_mainKVStorage.app_storage_kv_namespace_getKeys,
    app_storage_kv_namespace_getCount:
      ipcMainEvents_mainKVStorage.app_storage_kv_namespace_getCount,
  },
};

class MainKVStorageProvider extends AppStorageBase implements AppModule {
  private mainKV!: LowKVStorage;

  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.registerToIpcMainEvents();

    this.mainKV = this.initStorageKV("main");

    this.handleKVStorageEvents();

    this.registerToIpcRendererEvents();
  }

  private registerToIpcMainEvents() {
    Object.entries(ipcMainEvents_mainKVStorage).forEach(
      ([eventKey, eventName]) => {
        registerIpcMainEvent(eventKey, eventName);
      }
    );
  }

  private handleKVStorageEvents() {
    this.contextIpcMain.handle(
      ipcMainRendererEvents_mainKVStorage.invoke.app_storage_kv_hasItem,
      (event, key) =>
        this.mainKV
          .hasItem(key)
          .catch((error) => this.emitKVStorageError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_mainKVStorage.invoke.app_storage_kv_getItem,
      (event, key) =>
        this.mainKV
          .getItem(key)
          .catch((error) => this.emitKVStorageError(error))
    );

    this.contextIpcMain.on(
      ipcMainRendererEvents_mainKVStorage.send.app_storage_kv_setItem,
      (event, key, value) =>
        this.mainKV
          .setItem(key, value)
          .catch((error) => this.emitKVStorageError(error))
    );

    this.contextIpcMain.on(
      ipcMainRendererEvents_mainKVStorage.send.app_storage_kv_removeItem,
      (event, key) =>
        this.mainKV
          .removeItem(key)
          .catch((error) => this.emitKVStorageError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_mainKVStorage.invoke.app_storage_kv_getMeta,
      (event, key) =>
        this.mainKV
          .getMeta(key)
          .catch((error) => this.emitKVStorageError(error))
    );

    this.contextIpcMain.on(
      ipcMainRendererEvents_mainKVStorage.send.app_storage_kv_setMeta,
      (event, key, meta) =>
        this.mainKV
          .setMeta(key, meta)
          .catch((error) => this.emitKVStorageError(error))
    );

    this.contextIpcMain.on(
      ipcMainRendererEvents_mainKVStorage.send.app_storage_kv_removeMeta,
      (event, key, metaKeys) =>
        this.mainKV
          .removeMeta(key, metaKeys)
          .catch((error) => this.emitKVStorageError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_mainKVStorage.invoke.app_storage_kv_listNamespaces,
      (event) =>
        Promise.resolve(this.mainKV.namespaceNames()).catch((error) =>
          this.emitKVStorageError(error)
        )
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_mainKVStorage.invoke
        .app_storage_kv_namespace_getKeys,
      (event, namespaceName) =>
        this.mainKV
          .namespace(namespaceName)
          .keys()
          .catch((error) => this.emitKVStorageError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_mainKVStorage.invoke
        .app_storage_kv_namespace_getCount,
      (event, namespaceName) =>
        this.mainKV
          .namespace(namespaceName)
          .count()
          .catch((error) => this.emitKVStorageError(error))
    );

    this.contextIpcMain.on(
      ipcMainRendererEvents_mainKVStorage.send.app_storage_kv_namespace_clear,
      (event, namespaceName) =>
        this.mainKV
          .namespace(namespaceName)
          .clear()
          .catch((error) => this.emitKVStorageError(error))
    );
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererOnEvents(
      ipcMainRendererEvents_mainKVStorage.on
    );

    this.runtimeContext.registerIpcRendererSendEvents(
      ipcMainRendererEvents_mainKVStorage.send
    );

    this.runtimeContext.registerIpcRendererInvokeEvents(
      ipcMainRendererEvents_mainKVStorage.invoke
    );
  }

  private emitKVStorageError(error: Error) {
    const kvStorageError = new Error(`KV存储异常: ${error.message}`);

    this.contextIpcMain.emit(
      ipcMainRendererEvents_mainKVStorage.on.app_storage_kv_error,
      null,
      kvStorageError
    );
  }
}

export function initMainKVStorage() {
  return new MainKVStorageProvider();
}
