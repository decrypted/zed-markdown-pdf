import { CodeAction, CodeActionKind, Command } from "vscode-languageserver/node";

import { COMMAND_EXPORT } from "../constants";

/**
 * Build the "Export Markdown to PDF" code actions for a document.
 *
 * @remarks
 * Zed dispatches `workspace/executeCommand` when the user applies a code action
 * whose `command.command` is advertised in `executeCommandProvider` (verified in
 * `zed/crates/project/src/lsp_store.rs`, `apply_code_action`). Both Source and
 * QuickFix variants are returned so the action surfaces in either menu.
 *
 * @param documentUri - URI of the target document, forwarded as the command argument.
 * @returns The Source and QuickFix code actions, both bound to {@link COMMAND_EXPORT}.
 */
export function buildExportCodeActions(documentUri: string): CodeAction[] {
  const command: Command = {
    title: "Export to PDF",
    command: COMMAND_EXPORT,
    arguments: [documentUri],
  };

  return [
    {
      title: "Export Markdown to PDF",
      kind: `${CodeActionKind.Source}.exportToPdf`,
      command,
    },
    {
      title: "Export Markdown to PDF",
      kind: CodeActionKind.QuickFix,
      command,
    },
  ];
}
