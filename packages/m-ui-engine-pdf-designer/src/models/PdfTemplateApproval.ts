/**
 * Immutable approval-event record for a PDF template version.
 * Mirrors `Muonroi.RuleEngine.EntityFrameworkCore.Rules.PdfTemplateApprovalRecord`.
 *
 * One record is appended per lifecycle transition (submit / approve / reject),
 * providing a tamper-evident audit trail.
 */
export interface PdfTemplateApproval {
  /** Surrogate primary key (Guid as string). */
  id: string;
  /** Owning tenant identifier. */
  tenantId: string;
  /** FK to the associated `PdfTemplateVersion.id`. */
  templateVersionId: string;
  /** Human-facing template identifier (denormalised for query efficiency). */
  templateId: string;
  /** Version number of the associated template version. */
  version: number;
  /** Identity of the user who submitted this version for approval. */
  submittedBy: string;
  /** UTC submission timestamp (ISO 8601 string). */
  submittedAt: string;
  /** Identity of the approver, or null. */
  approvedBy?: string | null;
  /** UTC approval timestamp (ISO 8601 string), or null. */
  approvedAt?: string | null;
  /** Identity of the user who rejected, or null. */
  rejectedBy?: string | null;
  /** UTC rejection timestamp (ISO 8601 string), or null. */
  rejectedAt?: string | null;
  /** Rejection reason text, or null. */
  rejectionReason?: string | null;
  /** UTC creation timestamp of this approval record (ISO 8601 string). */
  createdAt: string;
}
