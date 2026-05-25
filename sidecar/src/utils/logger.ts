/**
 * Minimal logging surface so modules need not depend on the full LSP
 * `Connection`.
 *
 * @remarks
 * The LSP `connection.console` (a `RemoteConsole`) structurally satisfies this
 * interface, which keeps the rendering and PDF modules decoupled from the
 * language-server transport.
 */
export interface Logger {
  /**
   * Log an informational message.
   *
   * @param message - The text to record.
   */
  info(message: string): void;

  /**
   * Log a non-fatal warning.
   *
   * @param message - The text to record.
   */
  warn(message: string): void;

  /**
   * Log an error.
   *
   * @param message - The text to record.
   */
  error(message: string): void;
}
