import type { PdfTemplateStatus } from "./PdfTemplateStatus.js";

/**
 * Version record for a PDF template.
 * Mirrors `Muonroi.RuleEngine.EntityFrameworkCore.Rules.PdfTemplateVersionRecord`.
 *
 * Returned by:
 *   `GET /api/v1/control-plane/pdf-templates/{id}/versions`
 *   `GET /api/v1/control-plane/pdf-templates/{id}/versions/{version}`
 */
export interface PdfTemplateVersion {
  /** Surrogate primary key (Guid as string). */
  id: string;
  /** Owning tenant identifier. */
  tenantId: string;
  /** Human-facing template identifier. Matches parent PdfTemplate.templateId. */
  templateId: string;
  /** Monotonically-incrementing version number. */
  version: number;
  /**
   * Serialised HTML/CSS content of this version.
   * The raw value is an HTML string (content type declared in `contentType`).
   */
  contentJson: string;
  /** MIME content type of `contentJson` (e.g. `"text/html"`). */
  contentType: string;
  /** Lifecycle status of this version. */
  status: PdfTemplateStatus;
  /** Identity of the user who created this version. */
  createdBy: string;
  /** UTC creation timestamp (ISO 8601 string). */
  createdAt: string;
  /** UTC last-modified timestamp (ISO 8601 string). */
  updatedAt: string;
  /** Identity of the user who submitted for approval, or null. */
  submittedBy?: string | null;
  /** UTC submission timestamp (ISO 8601 string), or null. */
  submittedAt?: string | null;
  /** Identity of the user who approved, or null. */
  approvedBy?: string | null;
  /** UTC approval timestamp (ISO 8601 string), or null. */
  approvedAt?: string | null;
  /** Identity of the user who rejected, or null. */
  rejectedBy?: string | null;
  /** Rejection reason text, or null. */
  rejectedReason?: string | null;
  /** UTC activation/publish timestamp (ISO 8601 string), or null. */
  publishedAt?: string | null;
}

/**
 * Payload for `POST /api/v1/control-plane/pdf-templates/{id}/versions` (add draft version).
 * Source: `IPdfTemplateRegistryService.AddDraftVersionAsync` parameter shape.
 */
export interface AddPdfTemplateVersionPayload {
  contentJson: string;
  contentType: string;
  createdBy: string;
}

/**
 * Payload for `PUT /api/v1/control-plane/pdf-templates/{id}/versions/{version}` (update draft).
 * Source: `IPdfTemplateRegistryService.UpdateDraftAsync` parameter shape.
 */
export interface UpdatePdfTemplateVersionPayload {
  contentJson: string;
  contentType: string;
  updatedBy: string;
}
