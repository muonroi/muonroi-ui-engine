/**
 * Discriminated union of lifecycle action payloads for PDF template versions.
 *
 * Each variant corresponds to one lifecycle endpoint:
 *   - `submit`   → POST `.../versions/{version}:submit-for-approval`
 *   - `approve`  → POST `.../versions/{version}:approve`
 *   - `reject`   → POST `.../versions/{version}:reject`
 *   - `activate` → POST `.../versions/{version}:activate`
 *
 * Source: `IPdfTemplateRegistryService.cs` action parameter shapes.
 */
export type PdfTemplateLifecycleAction =
  | SubmitForApprovalAction
  | ApproveAction
  | RejectAction
  | ActivateAction;

export interface SubmitForApprovalAction {
  kind: "submit";
  submittedBy: string;
}

export interface ApproveAction {
  kind: "approve";
  approvedBy: string;
}

/** Reject action carries a mandatory rejection reason. */
export interface RejectAction {
  kind: "reject";
  rejectedBy: string;
  reason: string;
}

export interface ActivateAction {
  kind: "activate";
  activatedBy: string;
}
