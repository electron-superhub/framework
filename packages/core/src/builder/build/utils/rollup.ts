import { rollup, RollupError } from "rollup";
import { OnResolveResult, PartialMessage } from "esbuild";
import { isAbsolute, relative } from "pathe";

import { Esho } from "../../../types";

export async function rollupOutputMain(esho: Esho) {
  const { getMainRollupConfig } = await import("@esho/core/rollup");

  const mainRollupConfig = await getMainRollupConfig(esho);

  await esho.hooks.callHook("rollup:main", esho, mainRollupConfig);

  esho.logger.info("Rollup building main...");
  const build = await rollup(mainRollupConfig).catch((error) => {
    esho.logger.error(formatRollupError(error));
    throw error;
  });

  esho.logger.info("Rollup writing main...");
  await build.write(mainRollupConfig.output);
}

export async function rollupOutputPreload(esho: Esho) {
  const { getPreloadRollupConfig } = await import("@esho/core/rollup");

  const preloadRollupConfig = await getPreloadRollupConfig(esho);

  await esho.hooks.callHook("rollup:preload", esho, preloadRollupConfig);

  esho.logger.info("Rollup building preload...");
  const build = await rollup(preloadRollupConfig).catch((error) => {
    esho.logger.error(formatRollupError(error));
    throw error;
  });

  esho.logger.info("Rollup writing preload...");
  await build.write(preloadRollupConfig.output);
}

function formatRollupError(_error: RollupError | OnResolveResult) {
  try {
    const logs: string[] = [_error.toString()];
    const errors = (_error as any)?.errors || [_error as RollupError];
    for (const error of errors) {
      const id = (error as any).path || error.id || (_error as RollupError).id;
      let path = isAbsolute(id) ? relative(process.cwd(), id) : id;
      const location =
        (error as RollupError).loc || (error as PartialMessage).location;
      if (location) {
        path += `:${location.line}:${location.column}`;
      }
      const text =
        (error as PartialMessage).text || (error as RollupError).frame;
      logs.push(
        `Rollup error while processing \`${path}\`` + text ? "\n\n" + text : ""
      );
    }
    return logs.join("\n");
  } catch {
    return _error?.toString();
  }
}
