/**
 * Lifecycle state of a PDF template or version.
 * Mirrors `Muonroi.RuleEngine.EntityFrameworkCore.Rules.PdfTemplateStatus`.
 */
export type PdfTemplateStatus =
  | "Draft"
  | "PendingApproval"
  | "Approved"
  | "Rejected"
  | "Active"
  | "Superseded"
  | "RolledBack";

/** Numeric enum values as received from the server (integer → string mapping). */
export const PdfTemplateStatusValues: Record<number, PdfTemplateStatus> = {
  0: "Draft",
  1: "PendingApproval",
  2: "Approved",
  3: "Rejected",
  4: "Active",
  5: "Superseded",
  6: "RolledBack"
};
