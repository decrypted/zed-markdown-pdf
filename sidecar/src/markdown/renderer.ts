import MarkdownIt from "markdown-it";
import katex from "katex";

import hljsPlugin from "markdown-it-highlightjs";
import taskListsPlugin from "markdown-it-task-lists";
import texmathPlugin from "markdown-it-texmath";
import footnotePlugin from "markdown-it-footnote";
import anchorPlugin from "markdown-it-anchor";

import { registerMermaidFence } from "./mermaid";
import { defaultSlugify } from "./slugify";

/**
 * Construct a configured markdown-it instance.
 *
 * @remarks
 * Enables raw HTML (so user `<style>`/`<link>` tags survive), linkify, and
 * typographer, then registers: the Mermaid fence override, highlight.js,
 * KaTeX math (`$…$` / `$$…$$`), GitHub task lists, footnotes, and heading
 * anchors using {@link defaultSlugify}.
 *
 * @returns A ready-to-use markdown-it renderer.
 */
export function createMarkdownIt(): MarkdownIt {
  const md = new MarkdownIt({
    html: true, // honor user <style>/<link> tags
    linkify: true,
    typographer: true,
    breaks: false,
  });

  registerMermaidFence(md);

  md.use(hljsPlugin, { auto: true, code: true, inline: false, ignoreIllegals: true });
  md.use(texmathPlugin, {
    engine: katex,
    delimiters: "dollars",
    katexOptions: { throwOnError: false, strict: false },
  });
  md.use(taskListsPlugin, { enabled: true, label: true });
  md.use(footnotePlugin);
  md.use(anchorPlugin, { permalink: false, slugify: defaultSlugify });

  return md;
}

/**
 * Render Markdown source to an HTML fragment.
 *
 * @param markdown - The Markdown source text.
 * @returns The rendered HTML fragment (without a surrounding document).
 */
export function renderMarkdown(markdown: string): string {
  return createMarkdownIt().render(markdown);
}
