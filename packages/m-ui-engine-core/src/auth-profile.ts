import type { MUiEngineAuthProfile } from "./contracts.js";

export interface MAuthInterceptorOptions {
  profile: MUiEngineAuthProfile;
  baseApiUrl?: string;
  mGetToken?: () => string | null;
  mGetTenantId?: () => string | null;
  mFetch?: typeof fetch;
  mOnAuthFailure?: (response: Response) => void;
}

export function MBuildInterceptorFromAuthProfile(options: MAuthInterceptorOptions) {
  const mFetchImpl = options.mFetch ?? fetch;

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requestUrl = typeof input === "string" ? input : input.toString();
    const headers = new Headers(init?.headers ?? {});

    const token = MResolveToken(options.profile, options.mGetToken);
    if (token && options.profile.tokenSource === "header") {
      const value = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      headers.set(options.profile.tokenKey || "Authorization", value);
    }

    const tenantId = options.mGetTenantId?.();
    if (tenantId) {
      headers.set(options.profile.tenantHeaderKey || "X-Tenant-Id", tenantId);
    }

    headers.set(
      options.profile.correlationIdKey || "X-Correlation-Id",
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    );

    const response = await mFetchImpl(requestUrl, {
      ...init,
      headers,
      credentials: options.profile.tokenSource === "cookie" ? "include" : init?.credentials
    });

    if (response.status === 401) {
      if (options.profile.failurePolicy === "retry" && options.profile.refreshPath) {
        const refreshUrl = MResolveRefreshUrl(options.baseApiUrl, options.profile.refreshPath);
        const refreshResult = await mFetchImpl(refreshUrl, {
          method: "POST",
          credentials: "include"
        });

        if (refreshResult.ok) {
          return await mFetchImpl(requestUrl, {
            ...init,
            headers,
            credentials: options.profile.tokenSource === "cookie" ? "include" : init?.credentials
          });
        }
      } else if (options.profile.failurePolicy === "redirect") {
        if (typeof window !== "undefined") {
          window.location.assign("/login");
        }
      }

      options.mOnAuthFailure?.(response);
    }

    return response;
  };
}

function MResolveToken(profile: MUiEngineAuthProfile, resolver?: () => string | null): string | null {
  if (profile.tokenSource === "localStorage") {
    if (typeof localStorage === "undefined") {
      return null;
    }

    return localStorage.getItem(profile.tokenKey);
  }

  return resolver?.() ?? null;
}

function MResolveRefreshUrl(baseApiUrl: string | undefined, refreshPath: string): string {
  if (refreshPath.startsWith("http://") || refreshPath.startsWith("https://")) {
    return refreshPath;
  }

  const base = baseApiUrl ?? "";
  return `${base}${refreshPath}`;
}
