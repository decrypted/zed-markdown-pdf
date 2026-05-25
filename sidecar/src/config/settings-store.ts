import type { Connection } from "vscode-languageserver/node";
import { DidChangeConfigurationNotification } from "vscode-languageserver/node";

import { SETTINGS_SECTION } from "../constants";
import { DEFAULT_SETTINGS, ExportSettings, mergeSettings } from "./settings";

/**
 * Owns the live {@link ExportSettings} state and reconciles the two LSP
 * configuration delivery channels.
 *
 * @remarks
 * Configuration may arrive via server-initiated pull (`workspace/configuration`)
 * or client-initiated push (`workspace/didChangeConfiguration`). This class
 * caches the merged result and exposes an immutable {@link snapshot} for export
 * runs.
 */
export class SettingsStore {
  private current: ExportSettings = { ...DEFAULT_SETTINGS };
  private supportsPull = false;

  /**
   * @param connection - The active LSP connection used for config requests and logging.
   */
  constructor(private readonly connection: Connection) {}

  /**
   * Immutable snapshot for a single export run.
   *
   * @returns The current merged settings.
   */
  get snapshot(): ExportSettings {
    return this.current;
  }

  /**
   * Record whether the client advertised `workspace/configuration` support.
   *
   * @param supported - `true` if the client supports configuration pull.
   */
  setSupportsPull(supported: boolean): void {
    this.supportsPull = supported;
  }

  /**
   * Register for change notifications (when supported), then prime the cache.
   *
   * @remarks
   * No-op when the client lacks pull support; settings then arrive via push only.
   */
  async registerForChanges(): Promise<void> {
    if (!this.supportsPull) return;
    try {
      await this.connection.client.register(
        DidChangeConfigurationNotification.type,
        undefined,
      );
    } catch {
      // Client lacks dynamic registration — fall back to push-only delivery.
    }
    await this.pull();
  }

  /**
   * Pull the latest configuration from the client and update the cache.
   *
   * @remarks
   * Failures are logged and swallowed; the previous snapshot is retained.
   */
  async pull(): Promise<void> {
    try {
      const result = await this.connection.workspace.getConfiguration(SETTINGS_SECTION);
      this.current = mergeSettings(result as Partial<ExportSettings>);
      this.connection.console.info(`Settings refreshed: ${JSON.stringify(this.current)}`);
    } catch (err) {
      this.connection.console.warn(`Failed to pull settings: ${String(err)}`);
    }
  }

  /**
   * Apply a pushed `didChangeConfiguration` payload, then re-pull when possible.
   *
   * @param pushed - The notification's `settings` payload; the relevant branch
   * is extracted by {@link SETTINGS_SECTION} before merging.
   */
  async applyPush(pushed: unknown): Promise<void> {
    const section = (pushed ?? {}) as Record<string, unknown>;
    const branch = section[SETTINGS_SECTION] ?? pushed;
    this.current = mergeSettings(branch as Partial<ExportSettings>);
    this.connection.console.info(`Settings pushed: ${JSON.stringify(this.current)}`);

    if (this.supportsPull) {
      await this.pull();
    }
  }
}
