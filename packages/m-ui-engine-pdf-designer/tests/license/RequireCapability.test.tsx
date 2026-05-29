import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MLicenseVerifier } from "@muonroi/ui-engine-core";
import { RequireCapability } from "../../src/license/RequireCapability.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ChildContent(): React.JSX.Element {
  return <div data-testid="child-content">Designer content</div>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RequireCapability", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({})
    } as Response);

    MLicenseVerifier.MResetForTests();
  });

  afterEach(() => {
    cleanup(); // unmount all renders and clear the DOM
    vi.restoreAllMocks();
    MLicenseVerifier.MResetForTests();
  });

  // ── Denied / locked stub ──────────────────────────────────────────────────

  it("renders the locked stub when no license is initialized", () => {
    render(
      <RequireCapability capability="pdf.designer">
        <ChildContent />
      </RequireCapability>
    );

    expect(screen.queryByTestId("child-content")).toBeNull();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Enterprise Feature Locked/i)).toBeTruthy();
  });

  it("renders a custom fallback when provided and license is denied", () => {
    render(
      <RequireCapability
        capability="pdf.designer"
        fallback={<div data-testid="custom-fallback">Custom locked message</div>}
      >
        <ChildContent />
      </RequireCapability>
    );

    expect(screen.queryByTestId("child-content")).toBeNull();
    expect(screen.getByTestId("custom-fallback")).toBeTruthy();
    // Default locked stub should NOT appear (custom fallback is used instead)
    expect(screen.queryByText(/Enterprise Feature Locked/i)).toBeNull();
  });

  it("locked stub mentions the capability key", () => {
    render(
      <RequireCapability capability="pdf.designer">
        <ChildContent />
      </RequireCapability>
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("pdf.designer");
  });

  // ── Allowed / children render ─────────────────────────────────────────────

  it("renders children when hasAnyFeature returns true", () => {
    vi.spyOn(MLicenseVerifier, "hasAnyFeature").mockReturnValue(true);

    render(
      <RequireCapability capability="pdf.designer">
        <ChildContent />
      </RequireCapability>
    );

    expect(screen.getByTestId("child-content")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders children when hasAnyFeature returns true for a wildcard grant", () => {
    vi.spyOn(MLicenseVerifier, "hasAnyFeature").mockReturnValue(true);

    render(
      <RequireCapability capability="pdf.designer">
        <span data-testid="child">Active feature</span>
      </RequireCapability>
    );

    expect(screen.getByTestId("child").textContent).toBe("Active feature");
  });

  it("renders locked stub when hasAnyFeature returns false", () => {
    vi.spyOn(MLicenseVerifier, "hasAnyFeature").mockReturnValue(false);

    render(
      <RequireCapability capability="pdf.designer">
        <ChildContent />
      </RequireCapability>
    );

    expect(screen.queryByTestId("child-content")).toBeNull();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
