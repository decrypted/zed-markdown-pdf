import * as path from "path";
import { URI } from "vscode-uri";
import type { TextDocument } from "vscode-languageserver-textdocument";

/**
 * Resolve a document URI string to a local filesystem path.
 *
 * @param uri - A `file:` (or other) URI string.
 * @returns The corresponding filesystem path.
 */
export function uriToFsPath(uri: string): string {
  return URI.parse(uri).fsPath;
}

/**
 * Determine whether a document should be treated as Markdown.
 *
 * @remarks
 * Matches by LSP `languageId` first, then falls back to the file extension
 * (`.md`, `.markdown`, `.mdx`).
 *
 * @param doc - The text document to classify.
 * @returns `true` if the document is Markdown.
 */
export function isMarkdown(doc: TextDocument): boolean {
  if (doc.languageId === "markdown") return true;
  const ext = path.extname(URI.parse(doc.uri).fsPath).toLowerCase();
  return ext === ".md" || ext === ".markdown" || ext === ".mdx";
}
