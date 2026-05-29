/**
 * SignalR subscription for `TemplateChanged` events from the Muonroi Control Plane.
 *
 * Connects to the `RuleSetChangeHub` at `<baseUrl>/hubs/ruleset-changes` and subscribes
 * to the `"TemplateChanged"` method.
 *
 * Why NOT reusing `MUiEngineSignalRSchemaWatcher` (from `m-ui-engine-signalr`):
 *   That class is hardcoded to `"SchemaChanged"` / `"SubscribeToSchemaChanges"`.
 *   The 9.2 hub broadcasts `"TemplateChanged"` — a different method. Using the existing
 *   class would silently receive no events. This class wraps `@microsoft/signalr` directly.
 *
 * Constructor mirrors `MUiEngineSignalRSchemaWatcher` for consistency:
 *   `(hubUrl, getAccessToken?, getTenantId?)`
 *
 * Auth: `accessTokenFactory` plumbed to `HubConnectionBuilder.withUrl()` per SignalR convention.
 * Tenant: `X-Tenant-Id` header injected into the hub handshake headers.
 */

import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import type { PdfTemplateChange } from "../models/index.js";

export type { PdfTemplateChange };

/** Function returned by `onTemplateChanged` — call to remove the handler. */
export type UnsubscribeFn = () => void;

export class PdfTemplateChangeSubscription {
  private readonly mHubUrl: string;
  private readonly mGetAccessToken?: () => string | null;
  private readonly mGetTenantId?: () => string | null;
  private mConnection: HubConnection | null = null;
  private readonly mHandlers: Set<(change: PdfTemplateChange) => void> = new Set();

  /**
   * @param hubUrl         Full hub URL — typically `<controlPlaneBaseUrl>/hubs/ruleset-changes`.
   * @param getAccessToken Factory returning the current Bearer token (or null).
   * @param getTenantId    Factory returning the current tenant identifier (or null).
   */
  constructor(
    hubUrl: string,
    getAccessToken?: () => string | null,
    getTenantId?: () => string | null
  ) {
    this.mHubUrl = hubUrl;
    this.mGetAccessToken = getAccessToken;
    this.mGetTenantId = getTenantId;
  }

  /**
   * Start the hub connection. Safe to call multiple times — re-entrant (no-ops if already connected).
   */
  public async connect(): Promise<void> {
    if (
      this.mConnection !== null &&
      this.mConnection.state !== HubConnectionState.Disconnected
    ) {
      return;
    }

    this.mConnection = this.mBuildConnection();
    this.mConnection.on("TemplateChanged", (change: PdfTemplateChange) => {
      for (const handler of this.mHandlers) {
        handler(change);
      }
    });

    await this.mConnection.start();
  }

  /**
   * Stop the hub connection and remove all internal state.
   * Registered handlers remain in place — they will fire again if `connect()` is called again.
   */
  public async disconnect(): Promise<void> {
    if (this.mConnection !== null) {
      await this.mConnection.stop();
      this.mConnection = null;
    }
  }

  /**
   * Register a callback for `TemplateChanged` events.
   *
   * @returns An unsubscribe function. Call it to remove this specific handler.
   *
   * @example
   * ```ts
   * const unsub = subscription.onTemplateChanged((change) => {
   *   console.log("Template changed", change.templateId);
   * });
   * // later...
   * unsub();
   * ```
   */
  public onTemplateChanged(
    handler: (change: PdfTemplateChange) => void
  ): UnsubscribeFn {
    this.mHandlers.add(handler);
    return () => {
      this.mHandlers.delete(handler);
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private mBuildConnection(): HubConnection {
    const tenantId = this.mGetTenantId?.();
    const headers: Record<string, string> = {};
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
    }

    return new HubConnectionBuilder()
      .withUrl(this.mHubUrl, {
        accessTokenFactory: () => this.mGetAccessToken?.() ?? "",
        headers,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds(retryContext) {
          // Exponential backoff: 0 s, 2 s, 10 s, 30 s — then 30 s indefinitely.
          const delays = [0, 2000, 10000, 30000];
          return delays[retryContext.previousRetryCount] ?? 30000;
        },
      })
      .configureLogging(LogLevel.Warning)
      .build();
  }
}
