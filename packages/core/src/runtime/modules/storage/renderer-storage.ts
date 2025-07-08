import { AppContext, AppModule } from "../../../types";
import { LowStorage } from "../../storage";
import { AppStorageBase } from "./storage-base";

const ipcMainRendererEvents_rendererStorage = {
  on: {
    storage_collection_error: "renderer:on:storage:collection:error",
  },
  invoke: {
    storage_collection_findOne: "renderer:invoke:storage:collection:find-one",
    storage_collection_find: "renderer:invoke:storage:collection:find",
    storage_collection_insertOne:
      "renderer:invoke:storage:collection:insert-one",
    storage_collection_insertMany:
      "renderer:invoke:storage:collection:insert-many",
    storage_collection_updateOne:
      "renderer:invoke:storage:collection:update-one",
    storage_collection_updateMany:
      "renderer:invoke:storage:collection:update-many",
    storage_collection_deleteOne:
      "renderer:invoke:storage:collection:delete-one",
    storage_collection_deleteMany:
      "renderer:invoke:storage:collection:delete-many",
    storage_collection_getCount: "renderer:invoke:storage:collection:get-count",
  },
};

class RendererStorageProvider extends AppStorageBase implements AppModule {
  private rendererDb!: LowStorage;

  init(context: AppContext): Promise<void> | void {
    super.load(context);

    this.rendererDb = this.initStorageDb("renderer");

    this.handleStorageCollectionCRUDEvents();

    this.registerToIpcRendererEvents();
  }

  private handleStorageCollectionCRUDEvents() {
    this.contextIpcMain.handle(
      ipcMainRendererEvents_rendererStorage.invoke.storage_collection_findOne,
      (event, collectionName, query) =>
        this.rendererDb
          .collection(collectionName)
          .findOne(query)
          .catch((error) => this.emitStorageCollectionError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_rendererStorage.invoke.storage_collection_find,
      (event, collectionName, query) =>
        this.rendererDb
          .collection(collectionName)
          .find(query)
          .catch((error) => this.emitStorageCollectionError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_rendererStorage.invoke.storage_collection_insertOne,
      (event, collectionName, recordData) =>
        this.rendererDb
          .collection(collectionName)
          .insertOne(recordData)
          .catch((error) => this.emitStorageCollectionError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_rendererStorage.invoke
        .storage_collection_insertMany,
      (event, collectionName, recordDatas) =>
        this.rendererDb
          .collection(collectionName)
          .insertMany(recordDatas)
          .catch((error) => this.emitStorageCollectionError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_rendererStorage.invoke.storage_collection_updateOne,
      (event, collectionName, filter, update) =>
        this.rendererDb
          .collection(collectionName)
          .updateOne(filter, update)
          .catch((error) => this.emitStorageCollectionError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_rendererStorage.invoke
        .storage_collection_updateMany,
      (event, collectionName, filter, update) =>
        this.rendererDb
          .collection(collectionName)
          .updateMany(filter, update)
          .catch((error) => this.emitStorageCollectionError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_rendererStorage.invoke.storage_collection_deleteOne,
      (event, collectionName, filter) =>
        this.rendererDb
          .collection(collectionName)
          .deleteOne(filter)
          .catch((error) => this.emitStorageCollectionError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_rendererStorage.invoke
        .storage_collection_deleteMany,
      (event, collectionName, filter) =>
        this.rendererDb
          .collection(collectionName)
          .deleteMany(filter)
          .catch((error) => this.emitStorageCollectionError(error))
    );

    this.contextIpcMain.handle(
      ipcMainRendererEvents_rendererStorage.invoke.storage_collection_getCount,
      (event, collectionName) =>
        this.rendererDb
          .collection(collectionName)
          .count()
          .catch((error) => this.emitStorageCollectionError(error))
    );
  }

  private registerToIpcRendererEvents() {
    this.runtimeContext.registerIpcRendererOnEvents(
      ipcMainRendererEvents_rendererStorage.on
    );

    this.runtimeContext.registerIpcRendererInvokeEvents(
      ipcMainRendererEvents_rendererStorage.invoke
    );
  }

  private emitStorageCollectionError(error: Error) {
    const storageCollectionError = new Error(`数据存储异常: ${error.message}`);

    this.contextIpcMain.emit(
      ipcMainRendererEvents_rendererStorage.on.storage_collection_error,
      null,
      storageCollectionError
    );
  }
}

export function initRendererStorage() {
  return new RendererStorageProvider();
}
