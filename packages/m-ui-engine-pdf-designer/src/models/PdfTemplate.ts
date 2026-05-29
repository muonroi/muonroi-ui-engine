import type { PdfTemplateStatus } from "./PdfTemplateStatus.js";

/**
 * Summary projection returned by `GET /api/v1/control-plane/pdf-templates`
 * and detail projection by `GET /api/v1/control-plane/pdf-templates/{id}`.
 *
 * Field names match the server JSON serialiser (ASP.NET default camelCase).
 * Source: `IPdfTemplateRegistryService.cs` — `PdfTemplateSummaryItem` shape.
 */
export interface PdfTemplate {
  /** Surrogate primary key (Guid as string). */
  id: string;
  /** Owning tenant identifier. */
  tenantId: string;
  /** Human-facing template identifier (unique within a tenant). */
  templateId: string;
  /** Display name of the template. */
  name: string;
  /** Current lifecycle status of the template header. */
  status: PdfTemplateStatus;
  /** Whether a version is currently active/published. */
  isActive: boolean;
  /** FK to the currently published version record, or null. */
  currentVersionId?: string | null;
  /** Identity of the user who created this template. */
  createdBy: string;
  /** UTC creation timestamp (ISO 8601 string). */
  createdAt: string;
  /** UTC last-modified timestamp (ISO 8601 string). */
  updatedAt: string;
}

/**
 * Payload for `POST /api/v1/control-plane/pdf-templates` (create draft).
 * Source: `IPdfTemplateRegistryService.CreateDraftAsync` parameter shape.
 */
export interface CreatePdfTemplateDraftPayload {
  tenantId: string;
  templateId: string;
  name: string;
  contentJson: string;
  contentType: string;
  createdBy: string;
}
