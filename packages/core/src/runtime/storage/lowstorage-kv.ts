import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

import path from "node:path";
import fs from "node:fs";

type KVItem = {
  value: any;
  meta: Record<string, any>;
};

type NamespaceKVData = {
  mappings: Record<string, KVItem>;
};

class NamespaceKV {
  private lowKV!: Low<NamespaceKVData>;

  constructor(
    private readonly name: string,
    private readonly filePath: string
  ) {}

  private async resolveKV() {
    if (!this.lowKV) {
      const adapter = new JSONFile<NamespaceKVData>(this.filePath);
      const db = new Low<NamespaceKVData>(adapter, { mappings: {} });
      await db.read();
      db.data ||= { mappings: {} };

      this.lowKV = db;
    }

    return this.lowKV;
  }

  private checkValueType(value: any) {
    const nonJsonTypes = new Set(["undefined", "symbol", "function"]);

    const type = typeof value;

    if (nonJsonTypes.has(type)) {
      throw new TypeError(
        `setting value of type ${type} is not allowed as is not supported by JSON`
      );
    }
  }

  get namespaceName() {
    return this.name;
  }

  async hasItem(key: string) {
    const kv = await this.resolveKV();

    return key in kv.data.mappings;
  }

  async getItem(key: string) {
    const kv = await this.resolveKV();

    if (!kv.data.mappings[key])
      throw new Error(`not found the item of key ${key}`);

    return kv.data.mappings[key].value;
  }

  async setItem(key: string, value: any) {
    this.checkValueType(value);

    const kv = await this.resolveKV();

    kv.data.mappings[key] = {
      value,
      meta: Object.assign({}, kv.data.mappings[key]?.meta),
    };

    await kv.write();
  }

  async removeItem(key: string) {
    const kv = await this.resolveKV();

    delete kv.data.mappings[key];

    await kv.write();
  }

  async getMeta(key: string) {
    const kv = await this.resolveKV();

    if (!kv.data.mappings[key])
      throw new Error(`not found the item of key ${key}`);

    return kv.data.mappings[key].meta;
  }

  async setMeta(key: string, meta: Record<string, any>) {
    const kv = await this.resolveKV();

    if (!kv.data.mappings[key])
      throw new Error(`not found the item of key ${key}`);

    kv.data.mappings[key].meta = {
      ...kv.data.mappings[key].meta,
      ...meta,
    };

    await kv.write();
  }

  async removeMeta(key: string, metaKeys: string[]) {
    const kv = await this.resolveKV();

    if (!kv.data.mappings[key])
      throw new Error(`not found the item of key ${key}`);

    for (const metaKey of metaKeys) {
      delete kv.data.mappings[key].meta[metaKey];
    }

    await kv.write();
  }

  async keys() {
    const kv = await this.resolveKV();

    return Object.keys(kv.data.mappings);
  }

  async clear() {
    const kv = await this.resolveKV();

    kv.data.mappings = {};

    await kv.write();
  }

  async count() {
    const kv = await this.resolveKV();

    return Object.keys(kv.data.mappings).length;
  }

  has = (key: string) => this.hasItem(key);
  get = (key: string) => this.getItem(key);
  set = (key: string, value: any) => this.setItem(key, value);
  remove = (key: string) => this.removeItem(key);
}

export class LowKVStorage {
  private readonly namespaces: Record<string, NamespaceKV>;

  constructor(private readonly baseDirPath: string) {
    this.namespaces = Object.create(null);

    this.initNamespaces();
  }

  private initNamespaces() {
    if (!fs.existsSync(this.baseDirPath)) {
      fs.mkdirSync(this.baseDirPath, { recursive: true });
    }

    fs.readdirSync(this.baseDirPath)
      .filter((fileName) => fileName.endsWith(".json"))
      .forEach((fileName) => {
        const namespaceName = path.basename(fileName, ".json");
        const namespaceFilePath = path.join(this.baseDirPath, fileName);

        this.namespaces[namespaceName] = new NamespaceKV(
          namespaceName,
          namespaceFilePath
        );
      });
  }

  namespaceNames() {
    return Object.keys(this.namespaces);
  }

  namespace(name: string) {
    if (!this.namespaces[name]) {
      const namespaceFilePath = path.join(this.baseDirPath, `${name}.json`);
      this.namespaces[name] = new NamespaceKV(name, namespaceFilePath);
    }

    return this.namespaces[name];
  }

  private parseNamespaceWithKey(
    key: string,
    defaultNamespace: string = "global"
  ) {
    const idx = key.indexOf(":");

    if (idx > 0) return [key.slice(0, idx), key.slice(idx + 1)];

    if (idx === 0) return [defaultNamespace, key.slice(1)];

    return [defaultNamespace, key];
  }

  hasItem(key: string) {
    const [namespaceName, namespaceKey] = this.parseNamespaceWithKey(key);
    const namespaceKV = this.namespace(namespaceName);

    return namespaceKV.hasItem(namespaceKey);
  }

  getItem(key: string) {
    const [namespaceName, namespaceKey] = this.parseNamespaceWithKey(key);
    const namespaceKV = this.namespace(namespaceName);

    return namespaceKV.getItem(namespaceKey);
  }

  setItem(key: string, value: any) {
    const [namespaceName, namespaceKey] = this.parseNamespaceWithKey(key);
    const namespaceKV = this.namespace(namespaceName);

    return namespaceKV.setItem(namespaceKey, value);
  }

  removeItem(key: string) {
    const [namespaceName, namespaceKey] = this.parseNamespaceWithKey(key);
    const namespaceKV = this.namespace(namespaceName);

    return namespaceKV.removeItem(namespaceKey);
  }

  getMeta(key: string) {
    const [namespaceName, namespaceKey] = this.parseNamespaceWithKey(key);
    const namespaceKV = this.namespace(namespaceName);

    return namespaceKV.getMeta(namespaceKey);
  }

  setMeta(key: string, meta: Record<string, any>) {
    const [namespaceName, namespaceKey] = this.parseNamespaceWithKey(key);
    const namespaceKV = this.namespace(namespaceName);

    return namespaceKV.setMeta(namespaceKey, meta);
  }

  removeMeta(key: string, metaKeys: string[]) {
    const [namespaceName, namespaceKey] = this.parseNamespaceWithKey(key);
    const namespaceKV = this.namespace(namespaceName);

    return namespaceKV.removeMeta(namespaceKey, metaKeys);
  }

  has = (key: string) => this.hasItem(key);
  get = (key: string) => this.getItem(key);
  set = (key: string, value: any) => this.setItem(key, value);
  remove = (key: string) => this.removeItem(key);
}
