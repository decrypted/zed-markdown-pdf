import type { Page } from "puppeteer-core";

/**
 * Wait for client-side rendered content to settle before printing.
 *
 * @remarks
 * KaTeX is pre-rendered server-side, so only Mermaid diagrams require polling:
 * each `<pre class="mermaid">` is considered ready once it contains an `<svg>`
 * or is marked processed. Polls every 120ms and bails out after 10s to avoid
 * hanging on a diagram that never renders.
 *
 * @param page - The Puppeteer page to inspect.
 */
export async function waitForDynamicContent(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const pending = Array.from(document.querySelectorAll("pre.mermaid")).some(
        (el) => !el.querySelector("svg") && !(el as HTMLElement).dataset.processed,
      );
      if (!pending) return;
      await sleep(120);
    }
  });
}
