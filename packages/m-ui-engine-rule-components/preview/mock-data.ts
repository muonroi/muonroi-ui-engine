/**
 * Mock FCD (ePort Cát Lái Full Container Delivery) data for the standalone
 * Phase 4 UI preview. No backend required — served by the Vite middleware in
 * vite.preview.config.ts at /api/v1/living-docs/* and /api/v1/traceability/*.
 *
 * The data intentionally exercises all three TestCoverageState values so the
 * preview demonstrates the C-02 honesty constraint (UnitTestLinked vs
 * DryRunExampleOnly vs None map to three distinct badges).
 */

export const WORKFLOW = "fcd.cat-lai.delivery-order";
export const VERSION = 7;

export const LIVING_DOC = {
  workflow: WORKFLOW,
  version: VERSION,
  tenantId: "proj-eport-catlai",
  generatedAt: "2026-06-09T03:14:00Z",
  generatedFromVersionHash:
    "9f2c1a7be4d83a05c6f1e0b8d4a72193fe5c8d0a1b6e4f2c9d7a3b5e8c1f0d62",
  sections: [
    {
      nodeId: "n.eligibility.gate",
      title: "Delivery Order Eligibility Gate",
      sourceKind: "feel",
      inputs: [
        { name: "billOfLading.status", label: "B/L Status", dataType: "string" },
        { name: "customs.cleared", label: "Customs Cleared", dataType: "boolean" },
        { name: "container.holds", label: "Active Holds", dataType: "list" },
      ],
      outputs: [
        { name: "eligibleForDO", label: "Eligible for DO", dataType: "boolean" },
      ],
      logicProse:
        "A container becomes eligible for a Delivery Order only when its Bill of Lading is in the 'Released' state, customs clearance has been confirmed, and there are no active holds (e.g. payment, inspection, or line hold). If any hold remains, the container is not eligible regardless of customs status.",
    },
    {
      nodeId: "n.charges.demurrage",
      title: "Demurrage & Storage Charge Calculation",
      sourceKind: "decision-table",
      inputs: [
        { name: "freeTimeDaysRemaining", label: "Free-time Days Remaining", dataType: "number" },
        { name: "container.size", label: "Container Size", dataType: "string" },
        { name: "tariff.tier", label: "Tariff Tier", dataType: "string" },
      ],
      outputs: [
        { name: "demurrageAmount", label: "Demurrage Amount (VND)", dataType: "number" },
        { name: "storageAmount", label: "Storage Amount (VND)", dataType: "number" },
      ],
      logicProse:
        "When free time has expired, demurrage accrues per day based on container size (20ft / 40ft / 45ft) and the applicable tariff tier. The first tier of overdue days is charged at the base rate; subsequent tiers escalate. Storage is computed independently of demurrage and is not waived when demurrage is waived.",
    },
    {
      nodeId: "n.payment.verification",
      title: "Payment Verification Before Release",
      sourceKind: "nrules",
      inputs: [
        { name: "invoice.balanceDue", label: "Balance Due (VND)", dataType: "number" },
        { name: "payment.confirmedRefs", label: "Confirmed Payment Refs", dataType: "list" },
      ],
      outputs: [
        { name: "paymentSettled", label: "Payment Settled", dataType: "boolean" },
      ],
      logicProse:
        "Release is blocked until the outstanding invoice balance reaches zero. A balance is considered settled only when confirmed payment references cover the full amount due; pending or unconfirmed transfers do not unblock release.",
    },
    {
      nodeId: "n.do.issuance",
      title: "Delivery Order Issuance",
      sourceKind: "feel",
      inputs: [
        { name: "eligibleForDO", label: "Eligible for DO", dataType: "boolean" },
        { name: "paymentSettled", label: "Payment Settled", dataType: "boolean" },
      ],
      outputs: [
        { name: "doNumber", label: "DO Number", dataType: "string" },
        { name: "doValidUntil", label: "DO Valid Until", dataType: "date" },
      ],
      logicProse:
        "A Delivery Order is issued only when the container is eligible and payment is fully settled. The DO carries a validity window after which it must be re-issued. Issuance is the terminal step of the delivery decision flow.",
    },
  ],
  factDictionary: [
    { name: "billOfLading.status", label: "B/L Status", dataType: "string", description: "Lifecycle state of the Bill of Lading." },
    { name: "customs.cleared", label: "Customs Cleared", dataType: "boolean", description: "Whether customs clearance is confirmed." },
    { name: "container.holds", label: "Active Holds", dataType: "list", description: "Outstanding holds blocking release." },
    { name: "freeTimeDaysRemaining", label: "Free-time Days Remaining", dataType: "number", description: "Days left before demurrage accrues." },
    { name: "invoice.balanceDue", label: "Balance Due", dataType: "number", description: "Outstanding amount on the invoice (VND)." },
  ],
  coverage: {
    unitTestLinkedCount: 2,
    dryRunExampleCount: 1,
    noCoverageCount: 1,
    totalNodes: 4,
  },
};

export const TRACEABILITY = {
  workflow: WORKFLOW,
  version: VERSION,
  rows: [
    {
      nodeId: "n.eligibility.gate",
      title: "Delivery Order Eligibility Gate",
      nodeType: "feel",
      requirements: [
        { requirementId: "FCD-REQ-012", title: "No release with active holds", source: "BA Spec §3.2" },
        { requirementId: "FCD-REQ-014", title: "Customs clearance precondition", source: "BA Spec §3.4" },
      ],
      testCoverage: {
        state: "UnitTestLinked",
        linkedTestIds: ["EligibilityGateTests.Blocks_When_Hold_Present", "EligibilityGateTests.Allows_When_Cleared"],
        exampleCount: 0,
      },
    },
    {
      nodeId: "n.charges.demurrage",
      title: "Demurrage & Storage Charge Calculation",
      nodeType: "decision-table",
      requirements: [
        { requirementId: "FCD-REQ-021", title: "Tiered demurrage by container size", source: "Tariff 2026 §2" },
      ],
      testCoverage: {
        state: "DryRunExampleOnly",
        linkedTestIds: [],
        exampleCount: 3,
      },
      decisionTable: { columnCount: 4, rowCount: 9, hitPolicy: "FIRST" },
    },
    {
      nodeId: "n.payment.verification",
      title: "Payment Verification Before Release",
      nodeType: "nrules",
      requirements: [
        { requirementId: "FCD-REQ-030", title: "Zero balance before release", source: "BA Spec §5.1" },
      ],
      testCoverage: {
        state: "UnitTestLinked",
        linkedTestIds: ["PaymentVerificationTests.Blocks_On_Outstanding_Balance"],
        exampleCount: 0,
      },
    },
    {
      nodeId: "n.do.issuance",
      title: "Delivery Order Issuance",
      nodeType: "feel",
      requirements: [
        { requirementId: "FCD-REQ-040", title: "DO issued only when eligible and paid", source: "BA Spec §6.0" },
      ],
      testCoverage: {
        state: "None",
        linkedTestIds: [],
        exampleCount: 0,
      },
    },
  ],
};

/** A v6 → v7 prose change, used to demo the version-diff surface. */
export const LIVING_DOC_PREVIOUS = {
  ...LIVING_DOC,
  version: 6,
  generatedAt: "2026-05-30T09:00:00Z",
  generatedFromVersionHash:
    "1a2b3c4d5e6f70819aabbccddeeff00112233445566778899aabbccddeeff001",
  sections: LIVING_DOC.sections.map((s) =>
    s.nodeId === "n.payment.verification"
      ? {
          ...s,
          logicProse:
            "Release is blocked until the outstanding invoice balance reaches zero. Pending transfers are treated as settled for the purpose of release.",
        }
      : s
  ),
};
