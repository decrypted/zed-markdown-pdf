/**
 * Escape the five HTML-significant characters for safe interpolation into markup.
 *
 * @param value - Raw text that may contain `&`, `<`, `>`, `"`, or `'`.
 * @returns The escaped string, safe to embed in element content or attributes.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
