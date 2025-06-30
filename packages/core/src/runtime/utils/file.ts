import fs from "node:fs";
import { Transform } from "node:stream";
import { pipeline as streamPipeline } from "node:stream/promises";

export function copyFileReportProgress(
  sourceFilePath: string,
  destFilePath: string,
  progressListener?: (progress: string) => void
) {
  return fs.promises.stat(sourceFilePath).then((sourceFileState) => {
    const totalBytes = sourceFileState.size;
    let copiedBytes = 0;

    const readStream = fs.createReadStream(sourceFilePath);
    const writeStream = fs.createWriteStream(destFilePath);

    const progressTransform = new Transform({
      transform(chunk, encoding, callback) {
        copiedBytes += chunk.length;
        const copyProgress = ((copiedBytes / totalBytes) * 100).toFixed(2);

        progressListener?.(copyProgress);

        callback(null, chunk);
      },
    });

    return streamPipeline(readStream, progressTransform, writeStream);
  });
}
