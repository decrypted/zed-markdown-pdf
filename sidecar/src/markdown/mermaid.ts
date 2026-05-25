import type MarkdownIt from "markdown-it";
import type * as cheerio from "cheerio";

import { escapeHtml } from "../utils/html";

/**
 * ES-module snippet that loads the Mermaid runtime from a CDN and renders any
 * `<pre class="mermaid">` blocks on load.
 *
 * @remarks
 * Injected into `<head>` only when such blocks exist. Mirrors the pattern from
 * `ThomasLatham/markdown-pdf-plus`.
 */
export const MERMAID_RUNTIME_TAG = `
      <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ startOnLoad: true, securityLevel: 'loose' });
      </script>
    `;

/**
 * Install a fence renderer that short-circuits ```mermaid fences.
 *
 * @remarks
 * Intercepting before highlight.js runs avoids an unknown-language warning and
 * emits the `<pre class="mermaid">` markup the Mermaid runtime expects. Other
 * languages fall through to the original fence renderer.
 *
 * @param md - The markdown-it instance to mutate.
 */
export function registerMermaidFence(md: MarkdownIt): void {
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const tok = tokens[idx];
    if ((tok.info || "").trim().toLowerCase() === "mermaid") {
      return `<pre class="mermaid">${escapeHtml(tok.content)}</pre>\n`;
    }
    return fence ? fence(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
  };
}

/**
 * Replace any highlight.js-wrapped Mermaid code blocks with `<pre class="mermaid">`.
 *
 * @remarks
 * Catches Mermaid blocks that bypassed {@link registerMermaidFence} (e.g. when
 * highlight.js auto-detection wrapped them first).
 *
 * @param $ - The loaded document to transform in place.
 */
export function convertMermaidBlocks($: cheerio.CheerioAPI): void {
  $("code.language-mermaid, code.hljs.language-mermaid").each((_, el) => {
    const code = $(el).text();
    $(el).parent("pre").replaceWith(`<pre class="mermaid">${escapeHtml(code)}</pre>`);
  });
}
