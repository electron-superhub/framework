import { BinaryToTextEncoding, createHash, Hash } from "node:crypto";
import { Transform, TransformCallback } from "node:stream";

export class DigestTransform extends Transform {
  private readonly digester: Hash;

  private _actual: string | null = null;

  constructor(
    readonly expected: string,
    private readonly algorithm: string = "sha512",
    private readonly encoding: BinaryToTextEncoding = "base64"
  ) {
    super();

    this.digester = createHash(algorithm);
  }

  _transform(
    chunk: any,
    encoding: BufferEncoding,
    callback: TransformCallback
  ) {
    this.digester.update(chunk);
    callback(null, chunk);
  }

  _flush(callback: TransformCallback) {
    this._actual = this.digester.digest(this.encoding);

    try {
      this.validate();
      callback(null);
    } catch (e: any) {
      callback(e);
    }
  }

  validate() {
    if (this._actual == null) {
      throw new Error("stream not finished yet");
    }

    if (this._actual !== this.expected) {
      throw new Error(
        `${this.algorithm} checksum mismatch, expected ${this.expected}, got ${this._actual}`
      );
    }
  }

  get actual() {
    return this._actual;
  }
}

export class StringConcatTransform extends Transform {
  private readonly strChunks: string[] = [];

  private _resultStr: string | null = null;

  constructor(private readonly encoding: BufferEncoding = "utf8") {
    super();
  }

  _transform(
    chunk: any,
    encoding: BufferEncoding,
    callback: TransformCallback
  ) {
    if (typeof chunk === "string") {
      this.strChunks.push(chunk);
    } else {
      this.strChunks.push(chunk.toString(this.encoding));
    }

    callback(null, chunk);
  }

  _flush(callback: TransformCallback) {
    this._resultStr = this.strChunks.join("");

    callback(null);
  }

  get result() {
    return this._resultStr;
  }
}
