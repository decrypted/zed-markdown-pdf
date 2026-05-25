import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import type { TextDocuments } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { PDFOptions } from "puppeteer-core";
import { URI } from "vscode-uri";

import { ExportSettings } from "../config/settings";
import { Logger } from "../utils/logger";
import { uriToFsPath } from "../utils/uri";
import { buildHtmlDocument } from "../html/document-builder";
import { launchBrowser } from "./browser";
import { waitForDynamicContent } from "./page-readiness";
import { applyUserStylesheets } from "./user-stylesheets";
import { resolveOutputPath } from "./output-path";

/**
 * Reports incremental progress for the LSP work-done UI.
 *
 * @param message - Human-readable status shown to the user.
 * @param percent - Completion percentage in the range `0`–`100`.
 */
export type ProgressReporter = (message: string, percent: number) => void;

/** Inputs required to run a single {@link exportMarkdownToPdf} invocation. */
export interface ExportRequest {
  /** URI of the Markdown document to export. */
  documentUri: string;
  /**
   * Settings snapshot taken before the run.
   *
   * @remarks
   * Captured by the caller so a mid-export configuration change cannot
   * half-apply across the rendering and printing phases.
   */
  settings: ExportSettings;
  /** Open-document store; consulted for unsaved buffer contents. */
  documents: TextDocuments<TextDocument>;
  /** Diagnostic sink for non-fatal warnings during the run. */
  logger: Logger;
  /** Progress callback invoked at each pipeline stage. */
  progress: ProgressReporter;
}

/** Filesystem coordinates derived from a document URI. */
interface SourceLocation {
  /** Absolute path of the source Markdown file. */
  sourcePath: string;
  /** Directory containing the source file; the base for relative assets. */
  sourceDir: string;
  /** File name without extension; used for output and temp-file naming. */
  baseName: string;
}

/**
 * Convert a Markdown document into a PDF on disk.
 *
 * @remarks
 * Pipeline: Markdown → HTML ({@link buildHtmlDocument}) → temp file → headless
 * Chromium ({@link launchBrowser}) → PDF. The browser and temporary directory
 * are always cleaned up, even when printing throws.
 *
 * @param request - The fully-specified export request.
 * @returns The absolute path of the written PDF file.
 * @throws If Chromium cannot be launched or the page fails to render in time.
 */
export async function exportMarkdownToPdf(request: ExportRequest): Promise<string> {
  const { documentUri, settings, documents, logger, progress } = request;

  const location = resolveSourceLocation(documentUri);
  const markdown = await readMarkdownSource(documentUri, location.sourcePath, documents);

  progress("Rendering Markdown…", 10);
  const html = buildHtmlDocument(markdown, location.sourceDir, location.baseName, settings, logger);

  progress("Writing temporary HTML…", 25);
  const { tempDir, tempHtmlPath } = await writeTempHtml(html, location.baseName);

  progress("Launching Chromium…", 45);
  const browser = await launchBrowser(logger);
  try {
    const page = await browser.newPage();

    // Suppress Chromium's default print header/footer.
    await page.emulateMediaType("screen");

    progress("Loading rendered HTML…", 60);
    await page.goto(URI.file(tempHtmlPath).toString(), {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });

    await applyUserStylesheets(page, location.sourceDir, logger);

    progress("Waiting for dynamic content…", 80);
    await waitForDynamicContent(page);

    const outPath = resolveOutputPath(location.sourceDir, location.baseName, settings);
    progress("Printing PDF…", 92);
    await page.pdf(buildPdfOptions(outPath, settings));

    return outPath;
  } finally {
    await browser.close().catch(() => undefined);
    fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Derive the source path, directory, and base name from a document URI.
 *
 * @param documentUri - The Markdown document URI.
 * @returns The resolved {@link SourceLocation}.
 */
function resolveSourceLocation(documentUri: string): SourceLocation {
  const sourcePath = uriToFsPath(documentUri);
  return {
    sourcePath,
    sourceDir: path.dirname(sourcePath),
    baseName: path.basename(sourcePath, path.extname(sourcePath)),
  };
}

/**
 * Read Markdown source, preferring an open (possibly unsaved) editor buffer
 * over the on-disk file.
 *
 * @param documentUri - URI used to look up the open buffer.
 * @param sourcePath - Filesystem path used as the on-disk fallback.
 * @param documents - The open-document store.
 * @returns The Markdown text.
 */
async function readMarkdownSource(
  documentUri: string,
  sourcePath: string,
  documents: TextDocuments<TextDocument>,
): Promise<string> {
  const buffered = documents.get(documentUri);
  return buffered ? buffered.getText() : fs.promises.readFile(sourcePath, "utf8");
}

/**
 * Write rendered HTML to a fresh temporary directory.
 *
 * @param html - The complete HTML document.
 * @param baseName - Base file name (without extension) for the temp file.
 * @returns The created temp directory and the HTML file path within it.
 */
async function writeTempHtml(
  html: string,
  baseName: string,
): Promise<{ tempDir: string; tempHtmlPath: string }> {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "markdown-pdf-"));
  const tempHtmlPath = path.join(tempDir, `${baseName}.html`);
  await fs.promises.writeFile(tempHtmlPath, html, "utf8");
  return { tempDir, tempHtmlPath };
}

/**
 * Build Puppeteer print options, honoring the `usePageStyleFromCSS` setting.
 *
 * @remarks
 * When the user opts into CSS-defined `@page` rules, the explicit `format` and
 * `margin` are omitted so Chromium defers to `preferCSSPageSize`.
 *
 * @param outPath - Destination path for the PDF.
 * @param settings - The active export settings.
 * @returns A {@link PDFOptions} object for `page.pdf()`.
 */
function buildPdfOptions(outPath: string, settings: ExportSettings): PDFOptions {
  const useCssPage = settings.usePageStyleFromCSS;
  return {
    path: outPath,
    format: useCssPage ? undefined : (settings.pageSize as never),
    printBackground: true,
    preferCSSPageSize: useCssPage,
    displayHeaderFooter: false,
    margin: useCssPage
      ? undefined
      : {
          top: settings.marginTop,
          bottom: settings.marginBottom,
          left: settings.marginLeft,
          right: settings.marginRight,
        },
  };
}
