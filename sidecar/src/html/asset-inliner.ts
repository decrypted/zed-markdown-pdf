import * as fs from "fs";
import * as path from "path";
import type * as cheerio from "cheerio";
import { URI } from "vscode-uri";

import { imageMime } from "../utils/mime";

/**
 * Inline local `<img src="…">` references as base64 data URIs.
 *
 * @remarks
 * Remote (`http(s):`) and existing `data:` URLs are left untouched. A missing
 * file is left as-is so the rendered PDF falls back to the image's alt text.
 *
 * @param $ - The loaded document to transform in place.
 * @param sourceDir - Base directory for resolving relative `src` values.
 */
export function inlineLocalImages($: cheerio.CheerioAPI, sourceDir: string): void {
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (!src) return;
    if (/^(https?:|data:)/i.test(src)) return;

    const filePath = src.startsWith("file://")
      ? URI.parse(src).fsPath
      : path.resolve(sourceDir, src);

    try {
      const buf = fs.readFileSync(filePath);
      $(el).attr("src", `data:${imageMime(filePath)};base64,${buf.toString("base64")}`);
    } catch {
      // Missing image — leave src so the rendered PDF shows the alt text.
    }
  });
}

/**
 * Rewrite local `url(...)` references in CSS text to base64 data URIs.
 *
 * @remarks
 * Resolves relative URLs against `cssDir`. Remote, `data:`, and fragment (`#`)
 * URLs are preserved, as are references whose target cannot be read. Mirrors
 * `replaceLocalUrlsWithBase64()` from `markdown-pdf-plus`.
 *
 * @param cssText - The stylesheet text to process.
 * @param cssDir - Directory used to resolve relative `url(...)` targets.
 * @returns The CSS with local asset URLs inlined.
 */
export function inlineLocalCssUrls(cssText: string, cssDir: string): string {
  return cssText.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (match, url) => {
    if (/^(https?:|data:|#)/i.test(url)) return match;
    const absolute = path.isAbsolute(url) ? url : path.resolve(cssDir, url);
    try {
      const buf = fs.readFileSync(absolute);
      return `url(data:${imageMime(absolute)};base64,${buf.toString("base64")})`;
    } catch {
      return match;
    }
  });
}
