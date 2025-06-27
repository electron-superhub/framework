import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";
import sift from "sift";

import path from "node:path";
import fs from "node:fs";

type CollectionData = {
  records: any[];
};

type UpdateOperations = {
  $set: Record<string, any>;
};

class Collection {
  private lowDb!: Low<CollectionData>;

  constructor(
    private readonly name: string,
    private readonly filePath: string
  ) {}

  private async resolveDb() {
    if (!this.lowDb) {
      const adapter = new JSONFile<CollectionData>(this.filePath);
      const db = new Low<CollectionData>(adapter, { records: [] });
      await db.read();
      db.data ||= { records: [] };

      this.lowDb = db;
    }

    return this.lowDb;
  }

  get collectionName() {
    return this.name;
  }

  async count() {
    const db = await this.resolveDb();
    return db.data.records.length;
  }

  async findOne(query: Record<string, any>) {
    const matchRecords = await this.find(query);

    return matchRecords[0] || null;
  }

  async find(query: Record<string, any>) {
    const db = await this.resolveDb();

    const queryFilter = sift(query);
    return db.data.records.filter(queryFilter);
  }

  async insertOne(recordData: Record<string, any>) {
    const result = await this.insertMany([recordData]);

    return { insertedId: result.insertedIds[0] };
  }

  async insertMany(recordDatas: Record<string, any>[]) {
    const db = await this.resolveDb();

    const insertRecords = recordDatas.map((recordData) => ({
      _id: nanoid(),
      ...recordData,
    }));
    db.data.records.push(...insertRecords);

    await db.write();

    return { insertedIds: insertRecords.map((record) => record._id) };
  }

  updateOne(filter: Record<string, any>, update: UpdateOperations) {
    return this.update(filter, update, true);
  }

  updateMany(filter: Record<string, any>, update: UpdateOperations) {
    return this.update(filter, update, false);
  }

  private async update(
    filter: Record<string, any>,
    update: UpdateOperations,
    onlyFirstModified: boolean
  ) {
    const db = await this.resolveDb();

    let matchedCount = 0;
    let modifiedCount = 0;
    const updateFilter = sift(filter);

    db.data.records.forEach((record) => {
      if (updateFilter(record)) {
        matchedCount += 1;

        if (!(onlyFirstModified && modifiedCount > 0)) {
          Object.assign(record, update.$set, {
            _lastModified: new Date().toISOString(),
          });
          modifiedCount += 1;
        }
      }
    });

    await db.write();

    return { matchedCount, modifiedCount };
  }

  deleteOne(filter: Record<string, any>) {
    return this.delete(filter, true);
  }

  deleteMany(filter: Record<string, any>) {
    return this.delete(filter, false);
  }

  private async delete(filter: Record<string, any>, onlyFirstDeleted: boolean) {
    const db = await this.resolveDb();

    let deletedCount = 0;
    const deleteFilter = sift(filter);

    db.data.records = db.data.records.filter((record) => {
      if (deleteFilter(record)) {
        if (!(onlyFirstDeleted && deletedCount > 0)) {
          deletedCount += 1;
          return false;
        }
      }

      return true;
    });

    await db.write();

    return { deletedCount };
  }
}

export class LowStorage {
  private readonly collections: Record<string, Collection>;

  constructor(private readonly baseDirPath: string) {
    this.collections = Object.create(null);

    this.initCollections();
  }

  private initCollections() {
    if (!fs.existsSync(this.baseDirPath)) {
      fs.mkdirSync(this.baseDirPath, { recursive: true });
    }

    fs.readdirSync(this.baseDirPath)
      .filter((fileName) => fileName.endsWith(".json"))
      .forEach((fileName) => {
        const collectionName = path.basename(fileName, ".json");
        const collectionFilePath = path.join(this.baseDirPath, fileName);

        this.collections[collectionName] = new Collection(
          collectionName,
          collectionFilePath
        );
      });
  }

  collectionNames(): string[] {
    return Object.keys(this.collections);
  }

  collection(name: string) {
    if (!this.collections[name]) {
      const collectionFilePath = path.join(this.baseDirPath, `${name}.json`);
      this.collections[name] = new Collection(name, collectionFilePath);
    }

    return this.collections[name];
  }
}
