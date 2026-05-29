/**
 * Runtime configuration for @muonroi/ui-engine-pdf-designer.
 *
 * Mirrors `packages/m-ui-engine-rule-components/src/runtime/request-context.ts`
 * verbatim — same two-tier auth model (global config + per-client override).
 */

export interface MPdfDesignerRuntimeOptions {
  tenantId?: string | null;
  mGetTenantId?: () => string | null;
  headers?: Record<string, string> | null;
  mGetHeaders?: () => Record<string, string> | null;
}

let mRuntimeOptions: MPdfDesignerRuntimeOptions = {};

/** Configure global defaults applied to every PDF designer API request. */
export function MConfigurePdfDesignerRuntime(options?: MPdfDesignerRuntimeOptions): void {
  mRuntimeOptions = {
    ...mRuntimeOptions,
    ...(options ?? {})
  };
}

/** Reset runtime config — intended for test isolation only. */
export function MResetPdfDesignerRuntimeForTests(): void {
  mRuntimeOptions = {};
}

/**
 * Build a `Headers` object for a PDF designer request.
 *
 * Priority order (highest wins):
 *   1. `overrides.tenantId` (per-client constructor option)
 *   2. `mGetTenantId()` / `tenantId` from global runtime config
 *
 * Always injects `X-Correlation-Id` if absent.
 */
export function MBuildPdfDesignerHeaders(
  existing?: HeadersInit,
  overrides?: { tenantId?: string | null }
): Headers {
  const headers = new Headers(existing ?? {});

  const runtimeHeaders =
    mRuntimeOptions.mGetHeaders?.() ?? mRuntimeOptions.headers ?? {};
  for (const [key, value] of Object.entries(runtimeHeaders)) {
    if (value?.trim()) {
      headers.set(key, value.trim());
    }
  }

  const tenantId =
    overrides?.tenantId?.trim() ||
    mRuntimeOptions.mGetTenantId?.()?.trim() ||
    mRuntimeOptions.tenantId?.trim();
  if (tenantId) {
    headers.set("x-tenant-id", tenantId);
  }

  if (!headers.has("X-Correlation-Id")) {
    headers.set(
      "X-Correlation-Id",
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    );
  }

  return headers;
}
