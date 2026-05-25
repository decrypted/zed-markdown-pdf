import * as fs from "fs";
import * as path from "path";
import type { Page } from "puppeteer-core";

import { Logger } from "../utils/logger";
import { inlineLocalCssUrls } from "../html/asset-inliner";

/**
 * Attach every `<link rel="stylesheet">` from the source Markdown to the live page.
 *
 * @remarks
 * Loaded last so the user's sheets outrank the bundled `<style>` blocks. Remote
 * sheets are added by URL; local sheets are read from disk with their `url(...)`
 * references inlined ({@link inlineLocalCssUrls}). Individual failures are logged
 * and skipped rather than aborting the export.
 *
 * @param page - The Puppeteer page to augment.
 * @param sourceDir - Base directory for resolving relative `href` values.
 * @param logger - Sink for per-stylesheet load warnings.
 */
export async function applyUserStylesheets(
  page: Page,
  sourceDir: string,
  logger: Logger,
): Promise<void> {
  const links = await page.$$eval('link[rel="stylesheet"]', (els) =>
    els.map((e) => (e as HTMLLinkElement).getAttribute("href") ?? ""),
  );

  for (const href of links) {
    if (!href) continue;
    if (/^(https?:|data:)/i.test(href)) {
      try {
        await page.addStyleTag({ url: href });
      } catch (err) {
        logger.warn(`Remote stylesheet ${href} failed: ${String(err)}`);
      }
    } else {
      const abs = path.isAbsolute(href) ? href : path.resolve(sourceDir, href);
      try {
        const content = await fs.promises.readFile(abs, "utf8");
        await page.addStyleTag({ content: inlineLocalCssUrls(content, path.dirname(abs)) });
      } catch (err) {
        logger.warn(`Local stylesheet ${abs} failed: ${String(err)}`);
      }
    }
  }
}
