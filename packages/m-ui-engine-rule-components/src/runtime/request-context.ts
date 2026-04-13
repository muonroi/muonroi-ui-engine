export interface MRuleComponentRuntimeOptions {
  tenantId?: string | null;
  mGetTenantId?: () => string | null;
  headers?: Record<string, string> | null;
  mGetHeaders?: () => Record<string, string> | null;
}

let mRuntimeOptions: MRuleComponentRuntimeOptions = {};

export function MConfigureRuleComponentRuntime(options?: MRuleComponentRuntimeOptions): void {
  mRuntimeOptions = {
    ...mRuntimeOptions,
    ...(options ?? {})
  };
}

export function MResetRuleComponentRuntimeForTests(): void {
  mRuntimeOptions = {};
}

export function MBuildRuleComponentHeaders(existing?: HeadersInit, overrides?: { tenantId?: string | null }): Headers {
  const headers = new Headers(existing ?? {});
  const runtimeHeaders = mRuntimeOptions.mGetHeaders?.() ?? mRuntimeOptions.headers ?? {};
  for (const [key, value] of Object.entries(runtimeHeaders)) {
    if (value?.trim()) {
      headers.set(key, value.trim());
    }
  }

  const tenantId = overrides?.tenantId?.trim() || mRuntimeOptions.mGetTenantId?.()?.trim() || mRuntimeOptions.tenantId?.trim();
  if (tenantId) {
    headers.set("x-tenant-id", tenantId);
  }

  if (!headers.has("X-Correlation-Id")) {
    headers.set("X-Correlation-Id", globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  }

  return headers;
}
