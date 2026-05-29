/**
 * Kind of change reported by the template registry via SignalR.
 * Mirrors `Muonroi.Pdf.Enterprise.Registry.TemplateChangeKind`.
 */
export type TemplateChangeKind = "Updated" | "Deleted";

/**
 * Payload broadcast via `RuleSetChangeHub` on the `"TemplateChanged"` SignalR method.
 * Mirrors `Muonroi.Pdf.Enterprise.Registry.TemplateChange` (positional record).
 *
 * Wire shape (ASP.NET camelCase JSON serialisation):
 *   `{ templateId, newVersion, changeKind }`
 */
export interface PdfTemplateChange {
  /** Human-facing identifier of the affected template. */
  templateId: string;
  /**
   * The new version string (e.g. `"3"`) after the change,
   * or null if the template was deleted.
   */
  newVersion: string | null;
  /** The kind of change that occurred. */
  changeKind: TemplateChangeKind;
}
