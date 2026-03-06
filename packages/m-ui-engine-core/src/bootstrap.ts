import type { MUiEngineContractInfo, MUiEngineManifest } from "./contracts.js";
import { MUiEngineRuntime } from "./runtime.js";
import { MAssertUiEngineManifest, MUiEngineValidationError } from "./validation.js";

type MCacheKey = "current" | `user:${string}`;

interface MUiEngineBootstrapCacheEntry {
  runtime: MUiEngineRuntime;
  manifest: MUiEngineManifest;
  expiresAtEpochMs: number;
}

export interface MUiEngineSchemaChangedEvent {
  schemaHash?: string;
}

export interface MUiEngineSchemaWatcher {
  MSubscribe(onChanged: (event: MUiEngineSchemaChangedEvent) => void): (() => void) | Promise<() => void>;
}

export interface MUiEngineManifestRequestOptions {
  mAcceptLanguage?: string;
  mMinimalFor?: "routing" | string;
}

export interface MUiEngineManifestProvider {
  MLoadCurrent(options?: MUiEngineManifestRequestOptions): Promise<MUiEngineManifest>;
  MLoadByUserId(userId: string, options?: MUiEngineManifestRequestOptions): Promise<MUiEngineManifest>;
  MLoadContractInfo?(): Promise<MUiEngineContractInfo>;
}

export interface MUiEngineTelemetryEvent {
  kind: "cache_hit" | "cache_miss" | "manifest_loaded" | "manifest_invalid" | "contract_checked" | "schema_changed";
  source: "current" | "by_user";
  userId?: string;
  elapsedMs?: number;
  schemaVersion?: string;
  issueCount?: number;
}

export interface MUiEngineBootstrapOptions {
  mManifestProvider: MUiEngineManifestProvider;
  mTtlMs?: number;
  mNow?: () => number;
  mAcceptLanguage?: string;
  mOnTelemetry?: (event: MUiEngineTelemetryEvent) => void;
  mSchemaWatcher?: MUiEngineSchemaWatcher;
  mOnSchemaChanged?: (event: MUiEngineSchemaChangedEvent) => Promise<void> | void;
}

export class MUiEngineBootstrapper {
  private readonly mManifestProvider: MUiEngineManifestProvider;
  private readonly mTtlMs: number;
  private readonly mNow: () => number;
  private readonly mAcceptLanguage?: string;
  private readonly mOnTelemetry?: (event: MUiEngineTelemetryEvent) => void;
  private readonly mOnSchemaChanged?: (event: MUiEngineSchemaChangedEvent) => Promise<void> | void;
  private readonly mCache = new Map<MCacheKey, MUiEngineBootstrapCacheEntry>();
  private mSchemaWatcherUnsubscribe?: () => void;

  constructor(options: MUiEngineBootstrapOptions) {
    this.mManifestProvider = options.mManifestProvider;
    this.mTtlMs = options.mTtlMs ?? 60_000;
    this.mNow = options.mNow ?? (() => Date.now());
    this.mAcceptLanguage = options.mAcceptLanguage;
    this.mOnTelemetry = options.mOnTelemetry;
    this.mOnSchemaChanged = options.mOnSchemaChanged;

    if (options.mSchemaWatcher) {
      void this.MAttachSchemaWatcher(options.mSchemaWatcher);
    }
  }

  public async MLoadCurrentRuntime(forceRefresh = false): Promise<MUiEngineRuntime> {
    const entry = await this.MLoad("current", "current", undefined, forceRefresh);
    return entry.runtime;
  }

  public async MLoadRuntimeByUserId(userId: string, forceRefresh = false): Promise<MUiEngineRuntime> {
    const entry = await this.MLoad(`user:${userId}`, "by_user", userId, forceRefresh);
    return entry.runtime;
  }

  public MResetCache(): void {
    this.mCache.clear();
  }

  public async MDispose(): Promise<void> {
    this.mSchemaWatcherUnsubscribe?.();
    this.mSchemaWatcherUnsubscribe = undefined;
  }

  public async MCheckContractCompatibility(expectedSchemaVersion = "mui.engine.v2"): Promise<boolean> {
    if (!this.mManifestProvider.MLoadContractInfo) {
      return true;
    }

    const contractInfo = await this.mManifestProvider.MLoadContractInfo();
    const isCompatible = contractInfo.supportedSchemaVersions.includes(expectedSchemaVersion);

    this.mOnTelemetry?.({
      kind: "contract_checked",
      source: "current",
      schemaVersion: contractInfo.runtimeSchemaVersion
    });

    return isCompatible;
  }

  private async MLoad(
    key: MCacheKey,
    source: "current" | "by_user",
    userId: string | undefined,
    forceRefresh: boolean
  ): Promise<MUiEngineBootstrapCacheEntry> {
    const now = this.mNow();
    const cached = this.mCache.get(key);

    if (!forceRefresh && cached && cached.expiresAtEpochMs > now) {
      this.mOnTelemetry?.({
        kind: "cache_hit",
        source,
        userId
      });
      return cached;
    }

    this.mOnTelemetry?.({
      kind: "cache_miss",
      source,
      userId
    });

    const startMs = now;
    const manifest =
      source === "current"
        ? await this.mManifestProvider.MLoadCurrent({
            mAcceptLanguage: this.mAcceptLanguage
          })
        : await this.mManifestProvider.MLoadByUserId(userId ?? "", {
            mAcceptLanguage: this.mAcceptLanguage
          });

    try {
      MAssertUiEngineManifest(manifest);
    } catch (error) {
      if (error instanceof MUiEngineValidationError) {
        this.mOnTelemetry?.({
          kind: "manifest_invalid",
          source,
          userId,
          issueCount: error.mIssues.length
        });
      }

      throw error;
    }

    const runtime = new MUiEngineRuntime(manifest);
    const entry: MUiEngineBootstrapCacheEntry = {
      runtime,
      manifest,
      expiresAtEpochMs: this.mNow() + this.mTtlMs
    };

    this.mCache.set(key, entry);
    this.mOnTelemetry?.({
      kind: "manifest_loaded",
      source,
      userId,
      elapsedMs: this.mNow() - startMs,
      schemaVersion: manifest.schemaVersion
    });

    return entry;
  }

  private async MAttachSchemaWatcher(watcher: MUiEngineSchemaWatcher): Promise<void> {
    const unsubscribe = await watcher.MSubscribe(async (event) => {
      this.MResetCache();
      this.mOnTelemetry?.({
        kind: "schema_changed",
        source: "current"
      });

      await this.MLoadCurrentRuntime(true).catch(() => undefined);
      await this.mOnSchemaChanged?.(event);
    });

    this.mSchemaWatcherUnsubscribe = unsubscribe;
  }
}
