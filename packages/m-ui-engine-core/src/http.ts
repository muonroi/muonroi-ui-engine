import type {
  MUiEngineCatalogApiDescriptor,
  MUiEngineCatalogBinding,
  MUiEngineCatalogGraph,
  MUiEngineCatalogRuleDescriptor,
  MUiEngineContractInfo,
  MUiEngineManifest
} from "./contracts.js";

export interface MEngineHttpClientOptions {
  baseApiUrl: string;
  mGetAccessToken?: () => string | null;
  mGetTenantId?: () => string | null;
  mAcceptLanguage?: string | null;
  mGetAcceptLanguage?: () => string | null;
  mFetch?: typeof fetch;
}

export interface MEngineHttpError {
  status: number;
  code: string;
  message: string;
}

export function MCreateEngineFetch(options: MEngineHttpClientOptions) {
  const mFetchImpl = options.mFetch ?? fetch;

  return async function MFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = MBuildHeaders(options, init?.headers);

    const response = await mFetchImpl(`${options.baseApiUrl}${path}`, {
      ...init,
      headers
    });

    if (!response.ok) {
      throw await MBuildHttpError(response);
    }

    return (await response.json()) as T;
  };
}

export class MUiEngineApiClient {
  private readonly mFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
  private readonly mRawFetch?: (path: string, init?: RequestInit) => Promise<Response>;
  private readonly mETagMap = new Map<string, { etag: string; cached: unknown }>();
  private readonly mOptions?: MEngineHttpClientOptions;

  constructor(fetcher: <T>(path: string, init?: RequestInit) => Promise<T>);
  constructor(options: MEngineHttpClientOptions);
  constructor(fetcherOrOptions: (<T>(path: string, init?: RequestInit) => Promise<T>) | MEngineHttpClientOptions) {
    if (typeof fetcherOrOptions === "function") {
      this.mFetch = fetcherOrOptions;
      return;
    }

    const options = fetcherOrOptions;
    this.mOptions = options;
    this.mFetch = MCreateEngineFetch(options);
    const mFetchImpl = options.mFetch ?? fetch;
    this.mRawFetch = async (path: string, init?: RequestInit): Promise<Response> => {
      const headers = MBuildHeaders(options, init?.headers);
      return await mFetchImpl(`${options.baseApiUrl}${path}`, {
        ...init,
        headers
      });
    };
  }

  public async MLoadByUserId(
    userId: string,
    options?: { mAcceptLanguage?: string; mMinimalFor?: "routing" | string }
  ): Promise<MUiEngineManifest> {
    const path = MAppendQuery(`/auth/ui-engine/${userId}`, {
      minimalFor: options?.mMinimalFor
    });
    return await this.MFetchManifestWithEtag(path, options?.mAcceptLanguage);
  }

  public async MLoadCurrent(options?: {
    mAcceptLanguage?: string;
    mMinimalFor?: "routing" | string;
  }): Promise<MUiEngineManifest> {
    const path = MAppendQuery("/auth/ui-engine/current", {
      minimalFor: options?.mMinimalFor
    });
    return await this.MFetchManifestWithEtag(path, options?.mAcceptLanguage);
  }

  public async MLoadContractInfo(): Promise<MUiEngineContractInfo> {
    return await this.mFetch<MUiEngineContractInfo>("/auth/ui-engine/contract-info");
  }

  public async MLoadCatalogApis(): Promise<MUiEngineCatalogApiDescriptor[]> {
    return await this.mFetch<MUiEngineCatalogApiDescriptor[]>("/ui-engine/catalog/apis");
  }

  public async MLoadCatalogRules(): Promise<MUiEngineCatalogRuleDescriptor[]> {
    return await this.mFetch<MUiEngineCatalogRuleDescriptor[]>("/ui-engine/catalog/rules");
  }

  public async MLoadCatalogBindings(): Promise<MUiEngineCatalogBinding[]> {
    return await this.mFetch<MUiEngineCatalogBinding[]>("/ui-engine/catalog/bindings");
  }

  public async MLoadCatalogGraph(): Promise<MUiEngineCatalogGraph> {
    return await this.mFetch<MUiEngineCatalogGraph>("/ui-engine/catalog/graph");
  }

  private async MFetchManifestWithEtag(path: string, acceptLanguage?: string): Promise<MUiEngineManifest> {
    if (!this.mRawFetch) {
      return await this.mFetch<MUiEngineManifest>(path, MBuildAcceptLanguageInit(acceptLanguage));
    }

    const current = this.mETagMap.get(path);
    const headers = new Headers();
    if (current?.etag) {
      headers.set("If-None-Match", current.etag);
    }

    if (acceptLanguage?.trim()) {
      headers.set("Accept-Language", acceptLanguage.trim());
    } else if (this.mOptions) {
      const fallback = this.mOptions.mGetAcceptLanguage?.() ?? this.mOptions.mAcceptLanguage;
      if (fallback?.trim()) {
        headers.set("Accept-Language", fallback.trim());
      }
    }

    const response = await this.mRawFetch(path, { headers });

    if (response.status === 304 && current) {
      return current.cached as MUiEngineManifest;
    }

    if (!response.ok) {
      throw await MBuildHttpError(response);
    }

    const payload = (await response.json()) as MUiEngineManifest;
    const etag = response.headers.get("ETag") ?? current?.etag ?? "";
    if (etag) {
      this.mETagMap.set(path, {
        etag,
        cached: payload
      });
    }

    return payload;
  }
}

function MAppendQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (!value) {
      continue;
    }

    params.set(key, value);
  }

  const encoded = params.toString();
  if (!encoded) {
    return path;
  }

  return path.includes("?") ? `${path}&${encoded}` : `${path}?${encoded}`;
}

function MBuildAcceptLanguageInit(acceptLanguage?: string): RequestInit | undefined {
  if (!acceptLanguage?.trim()) {
    return undefined;
  }

  return {
    headers: {
      "Accept-Language": acceptLanguage.trim()
    }
  };
}

function MBuildHeaders(options: MEngineHttpClientOptions, existing?: HeadersInit): Headers {
  const headers = new Headers(existing ?? {});
  const token = options.mGetAccessToken?.();
  const tenantId = options.mGetTenantId?.();
  const acceptLanguage = options.mGetAcceptLanguage?.() ?? options.mAcceptLanguage;

  if (token) {
    headers.set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
  }

  if (tenantId) {
    headers.set("X-Tenant-Id", tenantId);
  }

  if (acceptLanguage?.trim()) {
    headers.set("Accept-Language", acceptLanguage.trim());
  }

  headers.set("X-Correlation-Id", globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  return headers;
}

async function MBuildHttpError(response: Response): Promise<MEngineHttpError> {
  const payload = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
  return {
    status: response.status,
    code: payload.error?.code ?? "UNKNOWN_ERROR",
    message: payload.error?.message ?? response.statusText
  };
}
