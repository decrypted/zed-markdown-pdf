/**
 * User-configurable export options, surfaced under the `markdown-pdf-export`
 * workspace configuration section.
 */
export interface ExportSettings {
  /** Top page margin (CSS length, e.g. `"20mm"`). */
  marginTop: string;
  /** Bottom page margin (CSS length). */
  marginBottom: string;
  /** Left page margin (CSS length). */
  marginLeft: string;
  /** Right page margin (CSS length). */
  marginRight: string;
  /** Paper size passed to Puppeteer (e.g. `"A4"`, `"Letter"`). */
  pageSize: string;
  /** Path to an extra stylesheet; absolute, or relative to the source file. */
  cssPath: string;
  /** Raw CSS injected as the highest-priority bundled style layer. */
  cssRaw: string;
  /** When `true`, defer paper size and margins to the document's own `@page` rules. */
  usePageStyleFromCSS: boolean;
  /** Output directory; defaults to the source file's directory when empty. */
  outputHome: string;
  /** Output file name (without extension); defaults to the source base name when empty. */
  outputFilename: string;
}

/** Built-in defaults applied when a setting is absent from the client config. */
export const DEFAULT_SETTINGS: ExportSettings = {
  marginTop: "20mm",
  marginBottom: "20mm",
  marginLeft: "18mm",
  marginRight: "18mm",
  pageSize: "A4",
  cssPath: "",
  cssRaw: "",
  usePageStyleFromCSS: false,
  outputHome: "",
  outputFilename: "",
};

/**
 * Merge a partial configuration object over {@link DEFAULT_SETTINGS}.
 *
 * @param incoming - Raw config from the LSP client. A `null`, `undefined`, or
 * non-object value yields the defaults unchanged.
 * @returns A fully-populated {@link ExportSettings} with defaults filling gaps.
 */
export function mergeSettings(
  incoming: Partial<ExportSettings> | null | undefined,
): ExportSettings {
  if (!incoming || typeof incoming !== "object") return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...incoming };
}
