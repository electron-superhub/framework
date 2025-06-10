import fs from "node:fs";
import { createHash } from "node:crypto";
import { pipeline as streamPipeline } from "node:stream/promises";

export async function hashFile(
  file: string,
  algorithm = "sha512",
  encoding: "base64" | "hex" = "base64",
  options?: any
) {
  const digester = createHash(algorithm);

  const readFileStream = fs.createReadStream(file, {
    ...options,
    highWaterMark: 1024 * 1024 /* better to use more memory but hash faster */,
  });

  return streamPipeline(readFileStream, digester).then(() =>
    digester.digest(encoding)
  );
}
