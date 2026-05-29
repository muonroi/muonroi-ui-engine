import { describe, expect, it } from "vitest";
import {
  PdfTemplateStatusValues,
  type PdfTemplateStatus
} from "../../src/models/PdfTemplateStatus.js";
import type { PdfTemplateChange, TemplateChangeKind } from "../../src/models/PdfTemplateChange.js";
import type {
  PdfTemplateLifecycleAction,
  SubmitForApprovalAction,
  ApproveAction,
  RejectAction,
  ActivateAction
} from "../../src/models/PdfTemplateLifecycleAction.js";
import type { PdfTemplate, CreatePdfTemplateDraftPayload } from "../../src/models/PdfTemplate.js";
import type { PdfTemplateVersion } from "../../src/models/PdfTemplateVersion.js";

// ---------------------------------------------------------------------------
// PdfTemplateStatus
// ---------------------------------------------------------------------------

describe("PdfTemplateStatus enum", () => {
  it("covers all 7 lifecycle status values", () => {
    const expected: PdfTemplateStatus[] = [
      "Draft",
      "PendingApproval",
      "Approved",
      "Rejected",
      "Active",
      "Superseded",
      "RolledBack"
    ];
    const actual = Object.values(PdfTemplateStatusValues);
    expect(actual).toEqual(expected);
  });

  it("maps numeric wire values to status strings (0–6)", () => {
    expect(PdfTemplateStatusValues[0]).toBe("Draft");
    expect(PdfTemplateStatusValues[1]).toBe("PendingApproval");
    expect(PdfTemplateStatusValues[2]).toBe("Approved");
    expect(PdfTemplateStatusValues[3]).toBe("Rejected");
    expect(PdfTemplateStatusValues[4]).toBe("Active");
    expect(PdfTemplateStatusValues[5]).toBe("Superseded");
    expect(PdfTemplateStatusValues[6]).toBe("RolledBack");
  });

  it("round-trips a status string through the numeric map", () => {
    const numericValue = 2; // Approved
    const status: PdfTemplateStatus = PdfTemplateStatusValues[numericValue];
    expect(status).toBe("Approved");
    // Verify the value can be used as a type-safe status
    const template: Pick<PdfTemplate, "status"> = { status };
    expect(template.status).toBe("Approved");
  });
});

// ---------------------------------------------------------------------------
// PdfTemplateChange wire shape
// ---------------------------------------------------------------------------

describe("PdfTemplateChange wire shape", () => {
  it("accepts a valid Updated change payload", () => {
    const change: PdfTemplateChange = {
      templateId: "invoice-v1",
      newVersion: "3",
      changeKind: "Updated"
    };
    expect(change.templateId).toBe("invoice-v1");
    expect(change.newVersion).toBe("3");
    expect(change.changeKind).toBe("Updated");
  });

  it("accepts a Deleted change payload with null newVersion", () => {
    const change: PdfTemplateChange = {
      templateId: "old-template",
      newVersion: null,
      changeKind: "Deleted"
    };
    expect(change.newVersion).toBeNull();
    expect(change.changeKind).toBe("Deleted");
  });

  it("constrains TemplateChangeKind to the union of Updated | Deleted", () => {
    const kinds: TemplateChangeKind[] = ["Updated", "Deleted"];
    expect(kinds).toHaveLength(2);
    // TypeScript would reject any other string — this is a runtime guard
    for (const k of kinds) {
      expect(["Updated", "Deleted"]).toContain(k);
    }
  });
});

// ---------------------------------------------------------------------------
// PdfTemplateLifecycleAction discriminated union
// ---------------------------------------------------------------------------

describe("PdfTemplateLifecycleAction discriminated union", () => {
  it("submit discriminant carries submittedBy field", () => {
    const action: SubmitForApprovalAction = { kind: "submit", submittedBy: "alice" };
    expect(action.kind).toBe("submit");
    expect(action.submittedBy).toBe("alice");
  });

  it("approve discriminant carries approvedBy field", () => {
    const action: ApproveAction = { kind: "approve", approvedBy: "bob" };
    expect(action.kind).toBe("approve");
    expect(action.approvedBy).toBe("bob");
  });

  it("reject discriminant carries rejectedBy and reason fields", () => {
    const action: RejectAction = {
      kind: "reject",
      rejectedBy: "carol",
      reason: "Non-compliant layout"
    };
    expect(action.kind).toBe("reject");
    expect(action.rejectedBy).toBe("carol");
    expect(action.reason).toBe("Non-compliant layout");
  });

  it("activate discriminant carries activatedBy field", () => {
    const action: ActivateAction = { kind: "activate", activatedBy: "dave" };
    expect(action.kind).toBe("activate");
    expect(action.activatedBy).toBe("dave");
  });

  it("union narrows correctly through kind discriminant", () => {
    const actions: PdfTemplateLifecycleAction[] = [
      { kind: "submit", submittedBy: "alice" },
      { kind: "approve", approvedBy: "bob" },
      { kind: "reject", rejectedBy: "carol", reason: "Bad" },
      { kind: "activate", activatedBy: "dave" }
    ];
    const kinds = actions.map((a) => a.kind);
    expect(kinds).toEqual(["submit", "approve", "reject", "activate"]);
  });

  it("CreatePdfTemplateDraftPayload has all required fields", () => {
    const payload: CreatePdfTemplateDraftPayload = {
      tenantId: "t1",
      templateId: "invoice-draft",
      name: "Invoice Draft",
      contentJson: "<html></html>",
      contentType: "text/html",
      createdBy: "alice"
    };
    expect(payload.tenantId).toBe("t1");
    expect(payload.contentType).toBe("text/html");
  });

  it("PdfTemplateVersion has version number and lifecycle actor fields", () => {
    const version: PdfTemplateVersion = {
      id: "ver-1",
      tenantId: "t1",
      templateId: "invoice",
      version: 1,
      contentJson: "<html></html>",
      contentType: "text/html",
      status: "Draft",
      createdBy: "alice",
      createdAt: "2026-05-01T00:00:00Z",
      updatedAt: "2026-05-01T00:00:00Z"
    };
    expect(version.version).toBe(1);
    expect(version.status).toBe("Draft");
    // Optional lifecycle actor fields
    expect(version.submittedBy).toBeUndefined();
    expect(version.approvedBy).toBeUndefined();
    expect(version.rejectedBy).toBeUndefined();
  });
});
