import * as fs from "fs";
import * as path from "path";

import { ExportSettings } from "../config/settings";

/**
 * Resolve the destination `.pdf` path.
 *
 * @remarks
 * Uses `settings.outputHome` and `settings.outputFilename` when set, otherwise
 * falls back to the source directory and base name. A configured but missing
 * `outputHome` is created (recursively) as a side effect.
 *
 * @param sourceDir - Directory of the source file (default output location).
 * @param baseName - Source base name (default output file name).
 * @param settings - Active settings supplying output overrides.
 * @returns The absolute path of the `.pdf` to write.
 */
export function resolveOutputPath(
  sourceDir: string,
  baseName: string,
  settings: ExportSettings,
): string {
  const dir = settings.outputHome || sourceDir;
  if (settings.outputHome && !fs.existsSync(settings.outputHome)) {
    fs.mkdirSync(settings.outputHome, { recursive: true });
  }
  const name = settings.outputFilename || baseName;
  return path.join(dir, `${name}.pdf`);
}
