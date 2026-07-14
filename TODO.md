# TODO

Potential hardening, not yet done. Both items below are **pre-existing** (inherited
from upstream, not introduced by this fork's changes) and only matter when exporting
**untrusted** Markdown — see the Security note in the README. Until they are
addressed, treat "the Markdown being rendered is trusted" as a project assumption.

## 1. Sanitize the rendered HTML before it reaches Chromium (critical)

`markdown-it` runs with `html: true` (`sidecar/src/markdown/renderer.ts`) and nothing
sanitizes the result before it is loaded into a headless browser with a `file://`
base and scripting enabled (`sidecar/src/html/document-builder.ts`,
`sidecar/src/pdf/exporter.ts`). A hostile `.md` containing `<script>` (or an
`<img>`/`<iframe>` pointing at local files) executes arbitrary JavaScript at export
time. The new **Export and Open** action widens the impact by auto-launching the
resulting PDF.

Related: repo-local `.zed/settings.json` is also trusted input — `cssRaw` is injected
into a `<style>` unescaped (a `</style><script>` breakout), and `cssPath` /
`outputFilename` allow absolute paths and `..` traversal.

**Fix idea:** run the rendered HTML through DOMPurify (strip `<script>`, `on*`
handlers, `<iframe>`, external `src`) before handing it to Chromium — while still
allowing the mermaid runtime we inject ourselves — or disable page JavaScript and
block non-`data:` request schemes.

## 2. Vendor Mermaid locally instead of loading it from a CDN (critical)

When a document contains a ```mermaid fence, the exporter injects
`import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/...'`
(`sidecar/src/markdown/mermaid.ts`) — unpinned, no SRI — and initializes it with
`securityLevel: 'loose'`. Every export of a document with a diagram fetches and runs
third-party JavaScript from a CDN inside the render browser, and `loose` lets the
diagram itself carry HTML/JS.

**Fix idea:** bundle Mermaid into the sidecar, pin an exact version, set
`securityLevel: 'strict'`, and drop the remote fetch. This also makes export work
offline.

## Lower priority

- The WASM coordinator downloads the sidecar tarball from a GitHub release with no
  checksum/signature verification (`src/lib.rs`); trust rests on GitHub + TLS.
- `puppeteer-chromium-resolver`'s host list includes a third-party mirror
  (`cdn.npmmirror.com`) as a Chromium fallback (`sidecar/src/pdf/browser.ts`).
