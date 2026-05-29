import React from "react";
import { MLicenseVerifier } from "@muonroi/ui-engine-core";

const M_PDF_DESIGNER_FEATURE_KEYS = [
  "ui-engine.pdf-designer",
  "pdf-designer",
  "pdf.designer"
];

const M_PDF_FEATURE_ALIASES: Record<string, string[]> = {
  "pdf.designer": ["ui-engine.pdf-designer", "pdf-designer"],
  "pdf-designer": ["ui-engine.pdf-designer", "pdf.designer"]
};

function MCanRenderCommercialFeature(capability: string): boolean {
  const candidates = MResolveFeatureCandidates(capability);
  return MLicenseVerifier.hasAnyFeature(candidates);
}

function MResolveFeatureCandidates(capability: string): string[] {
  const candidates = [
    ...M_PDF_DESIGNER_FEATURE_KEYS,
    capability,
    ...(M_PDF_FEATURE_ALIASES[capability] ?? [])
  ];
  return [...new Set(candidates.map((k) => k.trim()).filter((k) => k.length > 0))];
}

interface MLockedFeatureStubProps {
  capability: string;
}

function MLockedFeatureStub({ capability }: MLockedFeatureStubProps): React.JSX.Element {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "32px 24px",
        border: "1px solid #d97706",
        borderRadius: "8px",
        backgroundColor: "#fffbeb",
        color: "#92400e",
        fontFamily: "inherit",
        fontSize: "14px",
        textAlign: "center"
      }}
    >
      <span
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "#78350f"
        }}
      >
        Enterprise Feature Locked
      </span>
      <span>This feature requires an Enterprise license — capability key: {capability}</span>
      <a
        href="https://muonroi.com/pricing"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginTop: "8px",
          padding: "6px 16px",
          borderRadius: "4px",
          backgroundColor: "#92400e",
          color: "#ffffff",
          fontSize: "12px",
          textDecoration: "none"
        }}
      >
        Get a license
      </a>
    </div>
  );
}

export interface RequireCapabilityProps {
  /** The capability key to check (e.g. "pdf.designer"). */
  capability: string;
  /** Content to render when the capability is granted. */
  children: React.ReactNode;
  /** Optional custom fallback. Defaults to MLockedFeatureStub. */
  fallback?: React.ReactNode;
}

/**
 * Capability gate for commercial features.
 *
 * Wraps `MLicenseVerifier.hasAnyFeature` for React. When the resolved
 * license does NOT include `capability`, renders a locked-stub (or a
 * consumer-supplied `fallback`).
 *
 * Usage:
 * ```tsx
 * <RequireCapability capability="pdf.designer">
 *   <MuPdfTemplateDesigner ... />
 * </RequireCapability>
 * ```
 */
export function RequireCapability({
  capability,
  children,
  fallback
}: RequireCapabilityProps): React.JSX.Element {
  if (!MCanRenderCommercialFeature(capability)) {
    return <>{fallback ?? <MLockedFeatureStub capability={capability} />}</>;
  }
  return <>{children}</>;
}
