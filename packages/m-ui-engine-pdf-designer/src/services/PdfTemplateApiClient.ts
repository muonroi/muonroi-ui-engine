/**
 * REST client for the PDF template endpoints of the Muonroi Control Plane API.
 *
 * Mirrors the `MRuleEngineApi` shape from `m-ui-engine-rule-components/src/services/rule-engine-api.ts`.
 *
 * Auth convention (two-tier — identical to rule-components):
 *   1. Global: `MConfigurePdfDesignerRuntime({ headers: { Authorization: "Bearer ..." }, mGetTenantId })` at app start.
 *   2. Per-client: `getAccessToken` + `tenantId` constructor options (override global when set).
 *
 * Headers injected per request:
 *   - `Authorization: Bearer <token>` (from getAccessToken or global runtime)
 *   - `x-tenant-id: <tenantId>` (from constructor option or global runtime)
 *   - `X-Correlation-Id: <uuid>` (auto-generated per request)
 *   - `Content-Type: application/json` (only when request body is present)
 */

import type {
  PdfTemplate,
  CreatePdfTemplateDraftPayload,
  PdfTemplateVersion,
  AddPdfTemplateVersionPayload,
  UpdatePdfTemplateVersionPayload,
  PdfTemplateChange,
} from "../models/index.js";
import { MBuildPdfDesignerHeaders } from "../runtime/request-context.js";

// ── Options ──────────────────────────────────────────────────────────────────

export interface MPdfTemplateApiClientOptions {
  /** Control-plane API root, e.g. `https://host/api/v1/control-plane`. No trailing slash. */
  baseUrl: string;
  /** Fetch implementation (defaults to `globalThis.fetch`). Useful for test injection. */
  fetchImpl?: typeof fetch;
  /** Returns the current Bearer token, or null/undefined if not authenticated. */
  getAccessToken?: () => string | null;
  /** Tenant identifier injected as `x-tenant-id` on every request. */
  tenantId?: string;
}

// ── Error ─────────────────────────────────────────────────────────────────────

/**
 * Thrown when the server returns a non-2xx response.
 * Carries the HTTP status code and the parsed error message from the body (when available).
 */
export class PdfTemplateApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "PdfTemplateApiError";
  }
}

// ── Lifecycle action payload types ────────────────────────────────────────────

/** Optional payload for submit-for-approval — actor resolved from JWT if omitted. */
export interface SubmitForApprovalPayload {
  actor?: string;
}

/** Optional payload for approve — actor resolved from JWT if omitted. */
export interface ApprovePayload {
  actor?: string;
}

/** Payload for reject — reason is required by the server. */
export interface RejectPayload {
  reason: string;
  actor?: string;
}

/** Optional payload for activate — actor resolved from JWT if omitted. */
export interface ActivatePayload {
  actor?: string;
}

// Re-export so consumers can import from services/index.js without reaching into models.
export type { PdfTemplate, PdfTemplateVersion, PdfTemplateChange };

// ── Client ────────────────────────────────────────────────────────────────────

export class PdfTemplateApiClient {
  private readonly mBaseUrl: string;
  private readonly mFetch: typeof fetch;
  private readonly mGetAccessToken?: () => string | null;
  private readonly mTenantId: string;

  constructor(options: MPdfTemplateApiClientOptions) {
    this.mBaseUrl = options.baseUrl.replace(/\/+$/, "");
    const fetchImpl = (options.fetchImpl ?? globalThis.fetch).bind(globalThis);
    this.mFetch = (input: RequestInfo | URL, init?: RequestInit) =>
      fetchImpl(input, init);
    this.mGetAccessToken = options.getAccessToken;
    this.mTenantId = options.tenantId?.trim() ?? "";
  }

  // ── Template header endpoints ─────────────────────────────────────────────

  /**
   * `GET /api/v1/control-plane/pdf-templates`
   * Policy: `cp.viewer`
   */
  public async listTemplates(): Promise<PdfTemplate[]> {
    return this.mRequest<PdfTemplate[]>("/pdf-templates");
  }

  /**
   * `GET /api/v1/control-plane/pdf-templates/{id}`
   * Policy: `cp.viewer`
   */
  public async getTemplate(id: string): Promise<PdfTemplate> {
    return this.mRequest<PdfTemplate>(`/pdf-templates/${encodeURIComponent(id)}`);
  }

  /**
   * `POST /api/v1/control-plane/pdf-templates`
   * Policy: `cp.admin`
   */
  public async createTemplate(
    payload: CreatePdfTemplateDraftPayload
  ): Promise<PdfTemplate> {
    return this.mRequest<PdfTemplate>("/pdf-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ── Version endpoints ─────────────────────────────────────────────────────

  /**
   * `GET /api/v1/control-plane/pdf-templates/{id}/versions`
   * Policy: `cp.viewer`
   */
  public async listVersions(id: string): Promise<PdfTemplateVersion[]> {
    return this.mRequest<PdfTemplateVersion[]>(
      `/pdf-templates/${encodeURIComponent(id)}/versions`
    );
  }

  /**
   * `GET /api/v1/control-plane/pdf-templates/{id}/versions/{version}`
   * Policy: `cp.viewer`
   */
  public async getVersion(id: string, version: number): Promise<PdfTemplateVersion> {
    return this.mRequest<PdfTemplateVersion>(
      `/pdf-templates/${encodeURIComponent(id)}/versions/${version}`
    );
  }

  /**
   * `POST /api/v1/control-plane/pdf-templates/{id}/versions`
   * Policy: `cp.admin`
   */
  public async createDraftVersion(
    id: string,
    payload: AddPdfTemplateVersionPayload
  ): Promise<PdfTemplateVersion> {
    return this.mRequest<PdfTemplateVersion>(
      `/pdf-templates/${encodeURIComponent(id)}/versions`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * `PUT /api/v1/control-plane/pdf-templates/{id}/versions/{version}`
   * Policy: `cp.admin`
   */
  public async updateDraftVersion(
    id: string,
    version: number,
    payload: UpdatePdfTemplateVersionPayload
  ): Promise<PdfTemplateVersion> {
    return this.mRequest<PdfTemplateVersion>(
      `/pdf-templates/${encodeURIComponent(id)}/versions/${version}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  }

  // ── Lifecycle action endpoints ────────────────────────────────────────────

  /**
   * `POST /api/v1/control-plane/pdf-templates/{id}/versions/{version}:submit-for-approval`
   * Policy: `cp.admin`
   */
  public async submitForApproval(
    id: string,
    version: number,
    payload?: SubmitForApprovalPayload
  ): Promise<PdfTemplateVersion> {
    return this.mRequest<PdfTemplateVersion>(
      `/pdf-templates/${encodeURIComponent(id)}/versions/${version}:submit-for-approval`,
      {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      }
    );
  }

  /**
   * `POST /api/v1/control-plane/pdf-templates/{id}/versions/{version}:approve`
   * Policy: `cp.approver`
   */
  public async approve(
    id: string,
    version: number,
    payload?: ApprovePayload
  ): Promise<PdfTemplateVersion> {
    return this.mRequest<PdfTemplateVersion>(
      `/pdf-templates/${encodeURIComponent(id)}/versions/${version}:approve`,
      {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      }
    );
  }

  /**
   * `POST /api/v1/control-plane/pdf-templates/{id}/versions/{version}:reject`
   * Policy: `cp.approver`
   * Note: `reason` is required by the server.
   */
  public async reject(
    id: string,
    version: number,
    payload: RejectPayload
  ): Promise<PdfTemplateVersion> {
    return this.mRequest<PdfTemplateVersion>(
      `/pdf-templates/${encodeURIComponent(id)}/versions/${version}:reject`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * `POST /api/v1/control-plane/pdf-templates/{id}/versions/{version}:activate`
   * Policy: `cp.approver`
   */
  public async activate(
    id: string,
    version: number,
    payload?: ActivatePayload
  ): Promise<PdfTemplateVersion> {
    return this.mRequest<PdfTemplateVersion>(
      `/pdf-templates/${encodeURIComponent(id)}/versions/${version}:activate`,
      {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      }
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async mRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.mFetch(
      `${this.mBaseUrl}${path}`,
      this.mBuildInit(init)
    );

    if (!response.ok) {
      const serverMessage = await this.mExtractErrorMessage(response);
      throw new PdfTemplateApiError(response.status, serverMessage);
    }

    return (await response.json()) as T;
  }

  private mBuildInit(init: RequestInit): RequestInit {
    const headers = MBuildPdfDesignerHeaders(init.headers, {
      tenantId: this.mTenantId,
    });

    const token = this.mGetAccessToken?.();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }

    return { ...init, headers };
  }

  private async mExtractErrorMessage(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { error?: string; Error?: string } | null;
      return (
        body?.error ??
        body?.Error ??
        `PdfTemplate API error: ${response.status} ${response.statusText}`
      );
    } catch {
      return `PdfTemplate API error: ${response.status} ${response.statusText}`;
    }
  }
}
