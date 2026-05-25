import {
  CodeActionKind,
  InitializeResult,
  TextDocumentSyncKind,
} from "vscode-languageserver/node";

import { COMMAND_EXPORT } from "../constants";

/**
 * Build the capabilities advertised during the LSP `initialize` handshake.
 *
 * @remarks
 * Declares incremental text sync, a code-action provider (Source + QuickFix),
 * and the {@link COMMAND_EXPORT} execute-command provider.
 *
 * @returns The {@link InitializeResult} returned from `onInitialize`.
 */
export function buildInitializeResult(): InitializeResult {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.Source, CodeActionKind.QuickFix],
      },
      executeCommandProvider: {
        commands: [COMMAND_EXPORT],
      },
    },
  };
}
