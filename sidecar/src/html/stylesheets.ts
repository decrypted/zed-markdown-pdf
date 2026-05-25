import * as fs from "fs";
import * as path from "path";

import { ExportSettings } from "../config/settings";
import { fontMime } from "../utils/mime";

/**
 * Build the `@page` rule (paper size + margins).
 *
 * @remarks
 * Emitted only when the user has not opted into CSS-defined `@page` rules.
 *
 * @param settings - Active settings supplying page size and margins.
 * @returns A CSS `@page { … }` rule.
 */
export function buildPageRule(settings: ExportSettings): string {
  return `@page {
    size: ${settings.pageSize};
    margin-top: ${settings.marginTop};
    margin-bottom: ${settings.marginBottom};
    margin-left: ${settings.marginLeft};
    margin-right: ${settings.marginRight};
  }`;
}

/**
 * The lowest-priority, GitHub-flavored base stylesheet.
 *
 * @returns CSS covering typography, code blocks, tables, and print tweaks.
 */
export function baseStylesheet(): string {
  return `
    :root { color-scheme: light; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      line-height: 1.55;
      color: #1f2328;
      margin: 0;
      font-size: 14px;
    }
    .markdown-body { max-width: 820px; margin: 0 auto; padding: 0; }
    h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.25; margin: 1.6em 0 .6em; }
    h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    p, ul, ol, blockquote, pre, table { margin: 0 0 1em; }
    code { font-family: "SFMono-Regular", Menlo, Consolas, monospace; font-size: 85%;
           background: #f6f8fa; padding: .2em .4em; border-radius: 6px; }
    pre { background: #f6f8fa; padding: 1em; border-radius: 6px; overflow: auto; }
    pre code, pre code.hljs { background: transparent; padding: 0; }
    pre.mermaid { background: white; padding: .5em; text-align: center; }
    blockquote { color: #57606a; border-left: .25em solid #d0d7de; padding: 0 1em; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid #d0d7de; padding: 6px 12px; }
    th { background: #f6f8fa; }
    img { max-width: 100%; }
    a { color: #0969da; text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr { border: 0; border-top: 1px solid #d0d7de; height: 0; }
    .footnotes { font-size: 0.85em; border-top: 1px solid #d0d7de; margin-top: 2em; padding-top: 1em; }
    .task-list-item { list-style: none; }
    .task-list-item input[type="checkbox"] { margin: 0 .35em .25em -1.4em; vertical-align: middle; }
    @media print {
      .markdown-body { max-width: none; }
    }
  `;
}

/**
 * Read the bundled highlight.js GitHub theme.
 *
 * @remarks
 * Bundling avoids a CDN round-trip at print time. Tries the unminified theme
 * first, then the minified one.
 *
 * @returns The theme CSS, or an empty string if neither file resolves.
 */
export function highlightJsCss(): string {
  const candidates = [
    require.resolve("highlight.js/styles/github.css"),
    require.resolve("highlight.js/styles/github.min.css"),
  ];
  for (const candidate of candidates) {
    try {
      return fs.readFileSync(candidate, "utf8");
    } catch {
      // try next candidate
    }
  }
  return "";
}

/**
 * Read the bundled KaTeX CSS and inline its font files as data URIs.
 *
 * @remarks
 * KaTeX CSS references fonts relative to `katex/dist`, which would otherwise
 * resolve against the temp HTML's `<base href>`. Inlining the fonts makes the
 * stylesheet self-contained.
 *
 * @returns The KaTeX CSS with fonts embedded, or an empty string if it cannot
 * be resolved.
 */
export function katexCss(): string {
  try {
    const cssPath = require.resolve("katex/dist/katex.min.css");
    const cssDir = path.dirname(cssPath);
    const css = fs.readFileSync(cssPath, "utf8");
    return css.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (match, url) => {
      if (/^(https?:|data:|#)/i.test(url)) return match;
      const abs = path.isAbsolute(url) ? url : path.resolve(cssDir, url);
      try {
        const buf = fs.readFileSync(abs);
        return `url(data:${fontMime(abs)};base64,${buf.toString("base64")})`;
      } catch {
        return match;
      }
    });
  } catch {
    return "";
  }
}
