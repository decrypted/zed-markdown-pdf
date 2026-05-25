/**
 * Slugify heading text for anchor ids.
 *
 * @remarks
 * Lowercases, strips characters outside `[\w, CJK ideographs, whitespace, -]`,
 * then collapses whitespace runs into single hyphens. CJK ideographs are
 * preserved so Chinese headings yield usable anchors.
 *
 * @param text - The heading text.
 * @returns A URL-safe slug.
 */
export function defaultSlugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-龥\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
