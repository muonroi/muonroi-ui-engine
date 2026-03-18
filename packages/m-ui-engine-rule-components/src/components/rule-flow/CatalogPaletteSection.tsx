import React, { useMemo, useState } from "react";
import type { MRuleCatalogGroup, MRuleCatalogItem } from "../../models.js";

export interface CatalogPaletteSectionProps {
  groups: MRuleCatalogGroup[];
  loading: boolean;
  readOnly: boolean;
  onAddRule: (item: MRuleCatalogItem) => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>, item: MRuleCatalogItem) => void;
}

export function CatalogPaletteSection({
  groups,
  loading,
  readOnly,
  onAddRule,
  onDragStart
}: CatalogPaletteSectionProps): React.JSX.Element {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    const sortedGroups = [...groups].sort((left, right) => (left.category ?? "").localeCompare(right.category ?? ""));
    return sortedGroups
      .map((group) => ({
        ...group,
        items: [...group.items]
          .filter((item) => MMatchesSearch(item, normalizedSearch))
          .sort((left, right) => (left.displayName ?? "").localeCompare(right.displayName ?? ""))
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, normalizedSearch]);

  return (
    <div style={MCatalogShellStyle}>
      <div style={MCatalogHeaderStyle}>
        <strong>Rule Catalog</strong>
        <span>Load reusable rule templates from the control plane and drop them into the flow.</span>
      </div>
      <label style={MCatalogSearchLabelStyle}>
        Search rules
        <input
          data-testid="catalog-search-input"
          style={MCatalogSearchInputStyle}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, code, tag or description"
          disabled={loading}
        />
      </label>
      {loading ? (
        <div data-testid="catalog-loading-state" style={MCatalogPlaceholderStyle}>
          Loading rule catalog...
        </div>
      ) : null}
      {!loading && filteredGroups.length === 0 ? (
        <div data-testid="catalog-empty-state" style={MCatalogPlaceholderStyle}>
          {normalizedSearch ? "No rules match the current search." : "No rules available."}
        </div>
      ) : null}
      {!loading
        ? filteredGroups.map((group) => (
            <div key={group.category} data-testid={`catalog-group-${group.category}`} style={MCatalogGroupStyle}>
              <span style={MCatalogGroupTitleStyle} title={group.category}>
                {MShortCategory(group.category)}
              </span>
              {group.items.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  style={MCatalogItemButtonStyle}
                  data-testid={`palette-rule-${item.code}`}
                  draggable={!readOnly}
                  onClick={() => onAddRule(item)}
                  onDragStart={(event) => onDragStart(event, item)}
                  disabled={readOnly}
                >
                  <span style={MCatalogItemContentStyle}>
                    <strong>{item.displayName}</strong>
                    <span style={MCatalogCodeStyle}>{item.code}</span>
                    {item.description ? <span style={MCatalogDescriptionStyle}>{item.description}</span> : null}
                    {item.tags.length > 0 ? (
                      <span style={MCatalogTagsStyle}>{item.tags.join(" · ")}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ))
        : null}
    </div>
  );
}

function MShortCategory(category: string): string {
  const parts = category.split(".");
  return parts.length <= 2 ? category : parts.slice(-2).join(".");
}

function MMatchesSearch(item: MRuleCatalogItem, search: string): boolean {
  if (!search) {
    return true;
  }

  const haystack = [
    item.code,
    item.displayName,
    item.description ?? "",
    ...(item.tags ?? [])
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(search);
}

const MCatalogShellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const MCatalogHeaderStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  color: "#64748b"
};

const MCatalogSearchLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 12,
  color: "#475569",
  fontWeight: 600
};

const MCatalogSearchInputStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.32)",
  background: "#ffffff",
  color: "#0f172a",
  minHeight: 40,
  padding: "10px 12px",
  fontSize: 13
};

const MCatalogPlaceholderStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px dashed rgba(148, 163, 184, 0.35)",
  background: "rgba(248, 250, 252, 0.9)",
  color: "#64748b",
  padding: "12px 14px",
  fontSize: 13,
  lineHeight: 1.5
};

const MCatalogGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const MCatalogGroupTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#475569"
};

const MCatalogItemButtonStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(124, 58, 237, 0.14)",
  background: "rgba(124, 58, 237, 0.08)",
  color: "#0f172a",
  padding: "11px 12px",
  textAlign: "left",
  fontWeight: 600
};

const MCatalogItemContentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4
};

const MCatalogCodeStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#475569"
};

const MCatalogDescriptionStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#64748b"
};

const MCatalogTagsStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#7c3aed"
};
