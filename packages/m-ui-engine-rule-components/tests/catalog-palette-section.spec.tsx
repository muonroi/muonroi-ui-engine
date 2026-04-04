import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogPaletteSection } from "../src/components/rule-flow/CatalogPaletteSection";
import type { MRuleCatalogGroup, MRuleCatalogItem } from "../src/models";

const M_GROUPS: MRuleCatalogGroup[] = [
  {
    category: "Finance",
    items: [
      {
        code: "ORDER_AMOUNT_VALID",
        displayName: "Validate Order Amount",
        tags: ["amount", "validation"],
        description: "Checks order amount is greater than zero."
      }
    ]
  },
  {
    category: "Shipping",
    items: [
      {
        code: "FCD_V2_LINER_VALID",
        displayName: "Validate Liner Code",
        tags: ["liner", "registry"],
        description: "Checks liner code against registry."
      }
    ]
  }
];

describe("catalog palette section", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a loading state while the catalog request is active", () => {
    render(
      <CatalogPaletteSection
        groups={[]}
        loading
        readOnly={false}
        onAddRule={vi.fn()}
        onDragStart={vi.fn()}
      />
    );

    expect(screen.getByTestId("catalog-loading-state").textContent).toContain("Loading rule catalog");
  });

  it("renders groups sorted by category and items within each group", () => {
    render(
      <CatalogPaletteSection
        groups={M_GROUPS}
        loading={false}
        readOnly={false}
        onAddRule={vi.fn()}
        onDragStart={vi.fn()}
      />
    );

    const groupTitles = screen.getAllByTestId(/catalog-group-/).map((element) => element.getAttribute("data-testid"));
    expect(groupTitles).toEqual(["catalog-group-Finance", "catalog-group-Shipping"]);
    expect(screen.getByRole("button", { name: /validate order amount/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /validate liner code/i })).toBeTruthy();
  });

  it("filters catalog items by display name, description and tags", () => {
    render(
      <CatalogPaletteSection
        groups={M_GROUPS}
        loading={false}
        readOnly={false}
        onAddRule={vi.fn()}
        onDragStart={vi.fn()}
      />
    );

    fireEvent.change(screen.getAllByTestId("catalog-search-input")[0]!, {
      target: { value: "registry" }
    });

    expect(screen.getByRole("button", { name: /validate liner code/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /validate order amount/i })).toBeNull();
  });

  it("shows a no-rules placeholder when the catalog is empty", () => {
    render(
      <CatalogPaletteSection
        groups={[]}
        loading={false}
        readOnly={false}
        onAddRule={vi.fn()}
        onDragStart={vi.fn()}
      />
    );

    expect(screen.getByTestId("catalog-empty-state").textContent).toContain("No rules available");
  });

  it("emits add and drag callbacks for catalog items", () => {
    const onAddRule = vi.fn();
    const onDragStart = vi.fn();
    render(
      <CatalogPaletteSection
        groups={M_GROUPS}
        loading={false}
        readOnly={false}
        onAddRule={onAddRule}
        onDragStart={onDragStart}
      />
    );

    const item = screen.getAllByRole("button", { name: /validate liner code/i })[0]!;
    fireEvent.click(item);
    fireEvent.dragStart(item);

    expect(onAddRule).toHaveBeenCalledWith(expect.objectContaining<MRuleCatalogItem>({ code: "FCD_V2_LINER_VALID" }));
    expect(onDragStart).toHaveBeenCalled();
  });
});
