import got, { Progress } from "got";
import fs from "original-fs";
import { pipeline as streamPipeline } from "node:stream/promises";

import { DigestTransform, StringConcatTransform } from "./stream";

export function httpGetJson<T>(url: string): Promise<T> {
  return got(url).json<T>();
}

export function httpDownloadFile(
  url: string,
  destFilePath: string,
  sha512?: string,
  progressListener?: (progress: Progress) => void
) {
  const downloadStream = got.stream(url);
  downloadStream.on("downloadProgress", (progress) => {
    progressListener?.(progress);
  });

  const writeFileStream = fs.createWriteStream(destFilePath);

  if (sha512) {
    const sha512ChecksumTransform = new DigestTransform(sha512);

    return streamPipeline(
      downloadStream,
      sha512ChecksumTransform,
      writeFileStream
    );
  }

  return streamPipeline(downloadStream, writeFileStream);
}

export async function httpGetStreamToJson<T>(url: string): Promise<T> {
  const downloadStream = got.stream(url);

  const resolveResponseStrTransform = new StringConcatTransform();

  await streamPipeline(downloadStream, resolveResponseStrTransform);

  const responseContentStr = resolveResponseStrTransform.result || "{}";
  return JSON.parse(responseContentStr) as T;
}
