# Flow Designer UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Rule Flow Designer visual quality, interaction, and dark mode — library-only changes in `m-ui-engine-rule-components`.

**Architecture:** Extract a theme token system from hard-coded hex colors. Add SVG node icons, edge color coding, keyboard shortcuts, collapsible dependency overlay, and full dark mode. All changes in 4 files: `rule-flow-theme.ts` (new), `MuRuleFlowEditor.tsx`, `rule-flow-helpers.ts`, `rule-flow-inspector.tsx`.

**Tech Stack:** React 18, @xyflow/react 12.9.3, TypeScript, inline React.CSSProperties

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/rule-flow/rule-flow-theme.ts` | **Create** | Theme token system (light/dark), SVG icon strings, edge color map |
| `src/components/rule-flow/MuRuleFlowEditor.tsx` | **Modify** | Node card icons + backgrounds, edge colors, keyboard shortcuts, collapsible overlay, palette icons, dark mode wiring |
| `src/components/rule-flow/rule-flow-helpers.ts` | **Modify** | Export edge color constants |
| `src/components/rule-flow/rule-flow-inspector.tsx` | **Modify** | Theme-aware inspector styles |
| `src/components/rule-flow/CatalogPaletteSection.tsx` | **Modify** | Theme-aware catalog styles |

---

## Chunk 1: Theme System + Node Icons

### Task 1: Create theme token file

**Files:**
- Create: `src/components/rule-flow/rule-flow-theme.ts`

- [ ] **Step 1: Create `rule-flow-theme.ts` with light/dark token maps**

```typescript
// rule-flow-theme.ts — Theme tokens and SVG icons for rule flow designer
import type { MRuleFlowNodeType, MRuleFlowEdgeType } from "../../models.js";

export type MFlowTheme = "light" | "dark";

export interface MFlowThemeTokens {
  // Surfaces
  canvasBg: string;
  canvasGradient: string;
  sidebarBg: string;
  sidebarBorder: string;
  sidebarOpenBg: string;
  sidebarOpenBorder: string;
  sidebarOpenShadow: string;
  sidebarHeaderColor: string;
  // Nodes
  nodeBg: string;
  nodeBorder: string;
  nodeShadow: string;
  nodeText: string;
  nodeSubtext: string;
  nodeMutedText: string;
  // Inspector
  inspectorBg: string;
  inspectorBorder: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  labelColor: string;
  // Overlay
  overlayBg: string;
  overlayBorder: string;
  overlayShadow: string;
  overlayItemBg: string;
  overlayItemBorder: string;
  overlayItemSelectedBg: string;
  overlayItemSelectedBorder: string;
  // Dialogs
  backdropBg: string;
  dialogBg: string;
  dialogBorder: string;
  dialogShadow: string;
  // Common
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Palette
  paletteBtnBorder: string; // alpha hex appended to accent
  paletteBtnBg: string;     // alpha hex appended to accent
  // Edge hint
  hintBg: string;
  hintBorder: string;
  hintText: string;
  // Validation
  errorBg: string;
  errorBorder: string;
  errorText: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  // Delete
  deleteBg: string;
  deleteBorder: string;
  deleteText: string;
  // Misc
  chevronBg: string;
  chevronColor: string;
  sectionDescColor: string;
  tabActiveBorder: string; // alpha hex appended to accent
  tabActiveBg: string;     // alpha hex appended to accent
  tabInactiveBorder: string;
  tabInactiveBg: string;
}

export const M_LIGHT_TOKENS: MFlowThemeTokens = {
  canvasBg: "rgba(248,250,252,0.96)",
  canvasGradient: "radial-gradient(circle at top left, rgba(37,99,235,0.12), transparent 38%), linear-gradient(180deg, rgba(248,250,252,0.96), rgba(241,245,249,0.92))",
  sidebarBg: "rgba(248,250,252,0.92)",
  sidebarBorder: "1px solid rgba(148,163,184,0.18)",
  sidebarOpenBg: "rgba(255,255,255,0.94)",
  sidebarOpenBorder: "1px solid rgba(148,163,184,0.28)",
  sidebarOpenShadow: "0 12px 30px rgba(15,23,42,0.06)",
  sidebarHeaderColor: "#0f172a",
  nodeBg: "#ffffff",
  nodeBorder: "1px solid rgba(15,23,42,0.12)",
  nodeShadow: "0 14px 30px rgba(15,23,42,0.10)",
  nodeText: "#0f172a",
  nodeSubtext: "#475569",
  nodeMutedText: "#64748b",
  inspectorBg: "rgba(248,250,252,0.9)",
  inspectorBorder: "1px solid rgba(148,163,184,0.18)",
  inputBg: "#ffffff",
  inputBorder: "1px solid rgba(148,163,184,0.35)",
  inputText: "#0f172a",
  labelColor: "#334155",
  overlayBg: "rgba(255,255,255,0.95)",
  overlayBorder: "1px solid rgba(148,163,184,0.28)",
  overlayShadow: "0 18px 40px rgba(15,23,42,0.12)",
  overlayItemBg: "rgba(248,250,252,0.94)",
  overlayItemBorder: "1px solid rgba(148,163,184,0.2)",
  overlayItemSelectedBg: "rgba(219,234,254,0.92)",
  overlayItemSelectedBorder: "1px solid rgba(37,99,235,0.26)",
  backdropBg: "rgba(15,23,42,0.38)",
  dialogBg: "#ffffff",
  dialogBorder: "1px solid rgba(148,163,184,0.28)",
  dialogShadow: "0 24px 60px rgba(15,23,42,0.22)",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  paletteBtnBorder: "22",
  paletteBtnBg: "10",
  chevronBg: "rgba(148,163,184,0.12)",
  chevronColor: "#475569",
  sectionDescColor: "#64748b",
  tabActiveBorder: "40",
  tabActiveBg: "14",
  tabInactiveBorder: "1px solid rgba(148,163,184,0.24)",
  tabInactiveBg: "#ffffff",
  hintBg: "rgba(248,250,252,0.96)",
  hintBorder: "1px solid rgba(148,163,184,0.24)",
  hintText: "#334155",
  errorBg: "rgba(254,242,242,0.9)",
  errorBorder: "1px solid rgba(220,38,38,0.18)",
  errorText: "#b91c1c",
  warningBg: "rgba(255,251,235,0.9)",
  warningBorder: "1px solid rgba(245,158,11,0.18)",
  warningText: "#92400e",
  deleteBg: "rgba(254,242,242,0.96)",
  deleteBorder: "1px solid rgba(220,38,38,0.2)",
  deleteText: "#b91c1c"
};

export const M_DARK_TOKENS: MFlowThemeTokens = {
  canvasBg: "#1e293b",
  canvasGradient: "radial-gradient(circle at top left, rgba(37,99,235,0.16), transparent 38%), linear-gradient(180deg, #1e293b, #0f172a)",
  sidebarBg: "rgba(30,41,59,0.92)",
  sidebarBorder: "1px solid rgba(71,85,105,0.32)",
  sidebarOpenBg: "rgba(30,41,59,0.96)",
  sidebarOpenBorder: "1px solid rgba(71,85,105,0.45)",
  sidebarOpenShadow: "0 12px 30px rgba(0,0,0,0.25)",
  sidebarHeaderColor: "#e2e8f0",
  nodeBg: "#1e293b",
  nodeBorder: "1px solid rgba(71,85,105,0.38)",
  nodeShadow: "0 14px 30px rgba(0,0,0,0.25)",
  nodeText: "#e2e8f0",
  nodeSubtext: "#94a3b8",
  nodeMutedText: "#64748b",
  inspectorBg: "rgba(15,23,42,0.9)",
  inspectorBorder: "1px solid rgba(71,85,105,0.32)",
  inputBg: "#0f172a",
  inputBorder: "1px solid rgba(71,85,105,0.45)",
  inputText: "#e2e8f0",
  labelColor: "#cbd5e1",
  overlayBg: "rgba(30,41,59,0.95)",
  overlayBorder: "1px solid rgba(71,85,105,0.38)",
  overlayShadow: "0 18px 40px rgba(0,0,0,0.30)",
  overlayItemBg: "rgba(15,23,42,0.7)",
  overlayItemBorder: "1px solid rgba(71,85,105,0.3)",
  overlayItemSelectedBg: "rgba(37,99,235,0.2)",
  overlayItemSelectedBorder: "1px solid rgba(37,99,235,0.45)",
  backdropBg: "rgba(0,0,0,0.55)",
  dialogBg: "#1e293b",
  dialogBorder: "1px solid rgba(71,85,105,0.45)",
  dialogShadow: "0 24px 60px rgba(0,0,0,0.40)",
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  paletteBtnBorder: "30",
  paletteBtnBg: "18",
  chevronBg: "rgba(71,85,105,0.24)",
  chevronColor: "#94a3b8",
  sectionDescColor: "#94a3b8",
  tabActiveBorder: "55",
  tabActiveBg: "22",
  tabInactiveBorder: "1px solid rgba(71,85,105,0.32)",
  tabInactiveBg: "#1e293b",
  hintBg: "rgba(15,23,42,0.85)",
  hintBorder: "1px solid rgba(71,85,105,0.32)",
  hintText: "#94a3b8",
  errorBg: "rgba(127,29,29,0.25)",
  errorBorder: "1px solid rgba(220,38,38,0.35)",
  errorText: "#fca5a5",
  warningBg: "rgba(120,53,15,0.25)",
  warningBorder: "1px solid rgba(245,158,11,0.35)",
  warningText: "#fcd34d",
  deleteBg: "rgba(127,29,29,0.3)",
  deleteBorder: "1px solid rgba(220,38,38,0.35)",
  deleteText: "#fca5a5"
};

export function MGetThemeTokens(theme: MFlowTheme): MFlowThemeTokens {
  return theme === "dark" ? M_DARK_TOKENS : M_LIGHT_TOKENS;
}

/** SVG path data for node type icons (16x16 viewBox). */
export const M_NODE_ICONS: Record<MRuleFlowNodeType, string> = {
  trigger: "M8 2.5l5.5 5.5-5.5 5.5-1.4-1.4 4.1-4.1-4.1-4.1z",
  condition: "M8 1L15 8 8 15 1 8zm0 2.83L3.83 8 8 12.17 12.17 8z",
  action: "M7 2v5H2v2h5v5h2V9h5V7H9V2z",
  "decision-table": "M2 3h12v2H2zm0 4h12v2H2zm0 4h12v2H2z",
  "sub-flow": "M2 4h5v3H2zm7 0h5v3H9zM5.5 7v2h5V7M8 9v3m-3 0h6",
  liquid: "M8 1C5.8 5.3 3 7.4 3 10.5 3 13 5.2 15 8 15s5-2 5-4.5C13 7.4 10.2 5.3 8 1z",
  end: "M8 2a6 6 0 100 12A6 6 0 008 2zm0 2a4 4 0 110 8 4 4 0 010-8z"
};

/** Short descriptions for palette node buttons. */
export const M_NODE_DESCRIPTIONS: Record<MRuleFlowNodeType, string> = {
  trigger: "Entry point for the rule flow",
  condition: "Evaluate a rule with pass/fail routing",
  action: "Execute side effects or transformations",
  "decision-table": "Evaluate a FEEL decision table",
  "sub-flow": "Delegate to another rule flow",
  liquid: "Transform data with Liquid templates",
  end: "Terminal node — flow completes here"
};

/** Edge routing color map. */
export const M_EDGE_COLORS: Record<MRuleFlowEdgeType, string> = {
  always: "#64748b",
  "on-true": "#16a34a",
  "on-false": "#dc2626",
  "on-error": "#d97706"
};

/** Edge routing color map for dark mode. */
export const M_EDGE_COLORS_DARK: Record<MRuleFlowEdgeType, string> = {
  always: "#94a3b8",
  "on-true": "#4ade80",
  "on-false": "#f87171",
  "on-error": "#fbbf24"
};
```

- [ ] **Step 2: Verify file compiles**

Run: `cd D:/sources/Core/muonroi-ui-engine && npx tsc --noEmit -p packages/m-ui-engine-rule-components/tsconfig.json 2>&1 | head -20`
Expected: No errors related to `rule-flow-theme.ts`

- [ ] **Step 3: Commit**

```bash
git add packages/m-ui-engine-rule-components/src/components/rule-flow/rule-flow-theme.ts
git commit -m "feat(flow-designer): add theme token system with light/dark modes, node icons, edge colors"
```

---

### Task 2: Wire theme tokens + node icons into MRuleFlowNodeCard

**Files:**
- Modify: `src/components/rule-flow/MuRuleFlowEditor.tsx` (lines 1-170, 1673-1966)

- [ ] **Step 1: Add imports for theme system**

At top of `MuRuleFlowEditor.tsx`, add import:
```typescript
import { MGetThemeTokens, M_NODE_ICONS, M_NODE_DESCRIPTIONS, M_EDGE_COLORS, M_EDGE_COLORS_DARK, type MFlowThemeTokens } from "./rule-flow-theme.js";
```

- [ ] **Step 2: Refactor MRuleFlowNodeCard to accept theme tokens and render icons**

Replace the `MRuleFlowNodeCard` function (lines 126-159) with a version that:
1. Accepts `theme` from data (pass via `MCanvasNodeData`)
2. Renders an inline SVG icon before the type title
3. Uses a subtle accent gradient background
4. Uses theme tokens for text colors

```typescript
function MRuleFlowNodeCard({ data, selected }: { data: MCanvasNodeData; selected?: boolean }): React.JSX.Element {
  const accent = M_NODE_ACCENTS[data.nodeType];
  const tokens = MGetThemeTokens(data._theme ?? "light");
  const expression = MEnsureExpression(data);
  const requestCount = data.requestContract?.fields.length ?? 0;
  const responseCount = data.responseContract?.fields.length ?? 0;
  const iconPath = M_NODE_ICONS[data.nodeType];

  return (
    <div
      style={{
        minWidth: 188,
        borderRadius: data.nodeType === "end" ? 999 : data.nodeType === "condition" ? 24 : 18,
        border: selected ? `2px solid ${accent}` : tokens.nodeBorder,
        borderLeft: `8px solid ${accent}`,
        background: `linear-gradient(135deg, ${accent}08, ${tokens.nodeBg})`,
        boxShadow: tokens.nodeShadow,
        padding: "12px 14px"
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, color: accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d={iconPath} fill={accent} fillRule="evenodd" />
          </svg>
          {M_NODE_TITLES[data.nodeType]}
        </span>
        <strong style={{ fontSize: 14, color: tokens.nodeText }}>{data.label}</strong>
        {data.ruleCode ? <span style={{ fontSize: 12, color: tokens.nodeSubtext }}>Rule: {data.ruleCode}</span> : null}
        {data.contractRef?.sourceCode ? <span style={{ fontSize: 11, color: tokens.nodeMutedText }}>Contract: {data.contractRef.sourceType}/{data.contractRef.sourceCode}</span> : null}
        {expression.body ? (
          <span style={{ display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: tokens.nodeSubtext }}>
            {expression.language.toUpperCase()}: {expression.body}
          </span>
        ) : null}
        {(requestCount > 0 || responseCount > 0) ? <span style={{ fontSize: 11, color: tokens.nodeMutedText }}>Inline contracts {requestCount}/{responseCount}</span> : null}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

- [ ] **Step 3: Add `_theme` to MCanvasNodeData**

In `rule-flow-helpers.ts`, extend `MCanvasNodeData`:
```typescript
export type MCanvasNodeData = MRuleFlowNodeData & {
  label: string;
  ruleCode?: string;
  nodeType: MRuleFlowNodeType;
  _theme?: "light" | "dark";
};
```

- [ ] **Step 4: Thread theme into canvas nodes**

In `MuRuleFlowEditor.tsx`, in `MGraphToCanvasNodes` usage — update `setNodes` calls or `restoreCanvasState` to inject `_theme` into each node's data. The simplest approach: modify `MGraphToCanvasNodes` in `rule-flow-helpers.ts` to accept theme param, or inject theme in the `MuRuleFlowEditor` component when setting nodes.

Add a helper near top of `MuRuleFlowEditor`:
```typescript
function injectThemeIntoNodes(nodes: Node<MCanvasNodeData>[], theme: "light" | "dark"): Node<MCanvasNodeData>[] {
  return nodes.map(node => ({
    ...node,
    data: { ...node.data, _theme: theme }
  }));
}
```

Then wrap `setNodes` calls: wherever `MGraphToCanvasNodes(...)` is used, wrap with `injectThemeIntoNodes(..., theme)`.

- [ ] **Step 5: Verify build**

Run: `cd D:/sources/Core/muonroi-ui-engine && npx tsc --noEmit -p packages/m-ui-engine-rule-components/tsconfig.json 2>&1 | head -20`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(flow-designer): add SVG node icons, accent gradient backgrounds, theme-aware node rendering"
```

---

## Chunk 2: Edge Colors + Keyboard Shortcuts + Collapsible Overlay

### Task 3: Color-coded edges with pill badge labels

**Files:**
- Modify: `src/components/rule-flow/MuRuleFlowEditor.tsx` (lines 1136-1183 ReactFlow area, edge label rendering)

- [ ] **Step 1: Add edge style injection**

In `MuRuleFlowEditor`, before the ReactFlow JSX, compute styled edges:
```typescript
const styledEdges = useMemo(() => {
  const edgeColors = theme === "dark" ? M_EDGE_COLORS_DARK : M_EDGE_COLORS;
  return edges.map(edge => {
    const edgeType = MNormalizeEdgeType(edge.data?.edgeType);
    const color = edgeColors[edgeType];
    return {
      ...edge,
      style: { stroke: color, strokeWidth: 2 },
      animated: edge.id === selectedEdgeId,
      labelStyle: {
        fill: color,
        fontWeight: 700,
        fontSize: 11
      },
      labelBgStyle: {
        fill: theme === "dark" ? "#1e293b" : "#ffffff",
        fillOpacity: 0.92,
        stroke: color,
        strokeWidth: 1,
        rx: 8,
        ry: 8
      },
      labelBgPadding: [6, 4] as [number, number]
    };
  });
}, [edges, selectedEdgeId, theme]);
```

- [ ] **Step 2: Use styledEdges in ReactFlow**

Replace `edges={edges}` with `edges={styledEdges}` in the ReactFlow component (line ~1139).

- [ ] **Step 3: Verify visually — build and test**

Run: `cd D:/sources/Core/muonroi-ui-engine && npm run -w @muonroi/ui-engine-rule-components build:flow 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(flow-designer): color-coded edges with pill badge labels and animated selection"
```

---

### Task 4: Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Escape)

**Files:**
- Modify: `src/components/rule-flow/MuRuleFlowEditor.tsx` (lines 346-364, keyboard handler)

- [ ] **Step 1: Extend keyboard handler**

Replace the existing keyboard `useEffect` (lines 346-364) with:
```typescript
useEffect(() => {
  if (readOnly) {
    return;
  }
  const handler = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const isInputFocused = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;

    // Undo: Ctrl+Z (not Shift)
    if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey && !isInputFocused) {
      event.preventDefault();
      flushPendingCommit();
      history.undo();
      return;
    }
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if (((event.ctrlKey || event.metaKey) && event.key === "y") ||
        ((event.ctrlKey || event.metaKey) && event.key === "z" && event.shiftKey)) {
      if (!isInputFocused) {
        event.preventDefault();
        flushPendingCommit();
        history.redo();
        return;
      }
    }
    // Escape: deselect
    if (event.key === "Escape") {
      setSelectedNodeId("");
      setSelectedEdgeId("");
      setInspectorTab("general");
      return;
    }
    // Delete/Backspace: delete selected
    if (event.key === "Delete" || (event.key === "Backspace" && !isInputFocused)) {
      if (selectedNodeId) {
        deleteSelectedNode();
        return;
      }
      if (selectedEdgeId) {
        deleteSelectedEdge();
      }
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [readOnly, selectedNodeId, selectedEdgeId, history.canUndo, history.canRedo]);
```

- [ ] **Step 2: Add keyboard shortcut hints to Undo/Redo buttons**

Update the Undo/Redo buttons (line ~902-903) to include title attributes:
```typescript
<button ... title="Undo (Ctrl+Z)" ...>Undo</button>
<button ... title="Redo (Ctrl+Y)" ...>Redo</button>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(flow-designer): add keyboard shortcuts — Ctrl+Z undo, Ctrl+Y redo, Escape deselect, Backspace delete"
```

---

### Task 5: Collapsible dependency overlay

**Files:**
- Modify: `src/components/rule-flow/MuRuleFlowEditor.tsx` (lines 1184-1211, overlay rendering)

- [ ] **Step 1: Add overlay collapsed state**

Add state near other useState declarations (line ~301):
```typescript
const [overlayCollapsed, setOverlayCollapsed] = useState(false);
```

- [ ] **Step 2: Replace overlay rendering with collapsible version**

Replace the dependency overlay JSX (lines 1184-1211) with:
```typescript
{dependencyOverlay.length > 0 ? (
  <aside data-testid="rule-flow-dependency-overlay" style={{
    ...MDependencyOverlayStyle,
    width: overlayCollapsed ? "auto" : "min(320px, calc(100% - 32px))",
    maxHeight: overlayCollapsed ? "auto" : "calc(100% - 32px)"
  }}>
    <button
      type="button"
      onClick={() => setOverlayCollapsed(prev => !prev)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "none", border: "none", cursor: "pointer",
        padding: 0, color: tokens.textSecondary, fontSize: 12
      }}
      title={overlayCollapsed ? "Expand dependency overlay" : "Collapse dependency overlay"}
    >
      <strong style={{ color: tokens.textPrimary }}>Dependency Overlay</strong>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 22, height: 22, borderRadius: 999,
        background: tokens.chevronBg, fontSize: 11,
        transform: overlayCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
        transition: "transform 160ms ease"
      }}>▾</span>
    </button>
    {!overlayCollapsed ? (
      <>
        <span style={{ fontSize: 12, color: tokens.textMuted }}>
          Execution order, prerequisites, and downstream dependents.
        </span>
        <div style={MDependencyOverlayBodyStyle}>
          {dependencyOverlay.map((item) => (
            <button
              key={item.nodeId}
              type="button"
              data-testid={`dependency-overlay-${item.ruleCode}`}
              style={MDependencyOverlayItemStyle(item.nodeId === selectedNodeId)}
              onClick={() => selectNodeById(item.nodeId)}
            >
              <span style={{ fontWeight: 700, color: tokens.textPrimary }}>#{item.order} {item.label}</span>
              <span style={{ fontSize: 11, color: tokens.textSecondary }}>{item.ruleCode}</span>
              <span style={{ fontSize: 11, color: tokens.textMuted }}>
                Depends on: {item.dependsOn.length > 0 ? item.dependsOn.join(", ") : "none"}
              </span>
              <span style={{ fontSize: 11, color: tokens.textMuted }}>
                Unlocks: {item.dependents.length > 0 ? item.dependents.join(", ") : "none"}
              </span>
            </button>
          ))}
        </div>
      </>
    ) : null}
  </aside>
) : null}
```

- [ ] **Step 3: Compute tokens at component level**

Near line 866 (where `themeStyles` is computed), add:
```typescript
const tokens = MGetThemeTokens(theme);
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(flow-designer): collapsible dependency overlay with toggle button"
```

---

## Chunk 3: Palette Icons + Full Dark Mode

### Task 6: Palette buttons with icons and descriptions

**Files:**
- Modify: `src/components/rule-flow/MuRuleFlowEditor.tsx` (lines 867-888, palette panel)

- [ ] **Step 1: Update palette button rendering**

Replace the palette `.map(...)` block (lines 873-877) with:
```typescript
{(["trigger", "condition", "action", "decision-table", "sub-flow", "liquid", "end"] as MRuleFlowNodeType[]).map((nodeType) => {
  const accent = M_NODE_ACCENTS[nodeType];
  return (
    <button
      key={nodeType}
      type="button"
      style={{
        ...MPaletteButtonStyle(nodeType, tokens),
        display: "flex",
        alignItems: "flex-start",
        gap: 10
      }}
      data-testid={`palette-${nodeType}`}
      draggable={!readOnly}
      onClick={() => addNode(nodeType)}
      onDragStart={(event) => handlePaletteDragStart(event, nodeType)}
      disabled={readOnly}
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <path d={M_NODE_ICONS[nodeType]} fill={accent} fillRule="evenodd" />
      </svg>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span>{M_NODE_TITLES[nodeType]}</span>
        <span style={{ fontSize: 11, fontWeight: 400, color: tokens.textMuted }}>{M_NODE_DESCRIPTIONS[nodeType]}</span>
      </span>
    </button>
  );
})}
```

- [ ] **Step 2: Update `MPaletteButtonStyle` to accept tokens**

Replace `MPaletteButtonStyle` (line ~1810):
```typescript
function MPaletteButtonStyle(nodeType: MRuleFlowNodeType, tokens: MFlowThemeTokens): React.CSSProperties {
  return {
    borderRadius: 14,
    border: `1px solid ${M_NODE_ACCENTS[nodeType]}${tokens.paletteBtnBorder}`,
    background: `${M_NODE_ACCENTS[nodeType]}${tokens.paletteBtnBg}`,
    color: tokens.textPrimary,
    padding: "11px 12px",
    textAlign: "left",
    fontWeight: 600,
    cursor: "pointer"
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(flow-designer): palette buttons with SVG icons and node type descriptions"
```

---

### Task 7: Full dark mode — apply tokens to all style constants

**Files:**
- Modify: `src/components/rule-flow/MuRuleFlowEditor.tsx` (style constants at bottom, lines 1673-1966)
- Modify: `src/components/rule-flow/rule-flow-inspector.tsx` (inspector styles)
- Modify: `src/components/rule-flow/CatalogPaletteSection.tsx` (catalog styles)

- [ ] **Step 1: Convert static style constants to theme-aware functions in MuRuleFlowEditor.tsx**

Convert each static `const` to a function that accepts `MFlowThemeTokens`:

```typescript
// Replace static constants with functions that accept tokens.
// Key conversions (all in MuRuleFlowEditor.tsx bottom):

function MCanvasPanelStyleThemed(tokens: MFlowThemeTokens): React.CSSProperties {
  return {
    position: "relative",
    minWidth: 0,
    borderRadius: 24,
    overflow: "hidden",
    border: tokens.sidebarOpenBorder,
    background: tokens.canvasGradient
  };
}

function MSidebarStyleThemed(tokens: MFlowThemeTokens): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    borderRadius: 22,
    border: tokens.sidebarBorder,
    minHeight: 0,
    overflow: "hidden",
    background: tokens.sidebarBg
  };
}

function MSidebarSectionStyleThemed(isOpen: boolean, tokens: MFlowThemeTokens): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
    flex: isOpen ? "1 1 auto" : "0 0 auto",
    borderRadius: 20,
    border: isOpen ? tokens.sidebarOpenBorder : tokens.sidebarBorder,
    background: isOpen ? tokens.sidebarOpenBg : tokens.sidebarBg,
    boxShadow: isOpen ? tokens.sidebarOpenShadow : "none",
    overflow: "hidden"
  };
}

function MSidebarSectionHeaderStyleThemed(isOpen: boolean, tokens: MFlowThemeTokens): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
    border: "none",
    background: "transparent",
    padding: isOpen ? "14px 16px 0" : "14px 16px",
    color: tokens.sidebarHeaderColor,
    cursor: "pointer"
  };
}

function MDependencyOverlayStyleThemed(tokens: MFlowThemeTokens): React.CSSProperties {
  return {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    border: tokens.overlayBorder,
    background: tokens.overlayBg,
    boxShadow: tokens.overlayShadow,
    overflow: "auto"
  };
}

function MDependencyOverlayItemStyleThemed(selected: boolean, tokens: MFlowThemeTokens): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 14,
    border: selected ? tokens.overlayItemSelectedBorder : tokens.overlayItemBorder,
    background: selected ? tokens.overlayItemSelectedBg : tokens.overlayItemBg,
    color: tokens.textPrimary,
    cursor: "pointer"
  };
}

function MDeleteButtonStyleThemed(tokens: MFlowThemeTokens): React.CSSProperties {
  return {
    borderRadius: 14,
    border: tokens.deleteBorder,
    background: tokens.deleteBg,
    color: tokens.deleteText,
    padding: "11px 14px",
    fontWeight: 700
  };
}

function MPublishDialogStyleThemed(tokens: MFlowThemeTokens): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "min(560px, 100%)",
    padding: 20,
    borderRadius: 22,
    border: tokens.dialogBorder,
    background: tokens.dialogBg,
    boxShadow: tokens.dialogShadow
  };
}
```

- [ ] **Step 2: Update all JSX references to use themed versions**

Replace all style references in the component body:
- `MCanvasPanelStyle` → `MCanvasPanelStyleThemed(tokens)`
- `MSidebarStyle` → `MSidebarStyleThemed(tokens)`
- `MSidebarSectionStyle(isOpen)` → `MSidebarSectionStyleThemed(isOpen, tokens)`
- `MSidebarSectionHeaderStyle(isOpen)` → `MSidebarSectionHeaderStyleThemed(isOpen, tokens)`
- `MDependencyOverlayStyle` → `MDependencyOverlayStyleThemed(tokens)`
- `MDependencyOverlayItemStyle(...)` → `MDependencyOverlayItemStyleThemed(..., tokens)`
- `MDeleteButtonStyle` → `MDeleteButtonStyleThemed(tokens)`
- `MPublishDialogStyle` → `MPublishDialogStyleThemed(tokens)`
- `MPublishDialogBackdropStyle` → inline with `tokens.backdropBg`
- Remove `MLightThemeStyle`/`MDarkThemeStyle` — already handled by tokens
- Update `MSectionTitleStyle` to use `tokens.textMuted`
- Update edge inspector styles to use tokens

- [ ] **Step 3: Wire ReactFlow colorMode prop**

Add `colorMode` prop to ReactFlow:
```typescript
<ReactFlow
  colorMode={theme}
  ...
```

- [ ] **Step 4: Update inspector and catalog styles for dark mode**

In `rule-flow-inspector.tsx`:
- Export `MGetThemeTokens` import
- Pass tokens through inspector props or use a context
- The simplest approach: add `theme?: "light" | "dark"` to `MRuleFlowInspectorProps` and compute tokens inside

In `CatalogPaletteSection.tsx`:
- Add `theme?: "light" | "dark"` prop
- Use tokens for search input, item backgrounds, text colors

- [ ] **Step 5: Verify build**

Run: `cd D:/sources/Core/muonroi-ui-engine && npm run -w @muonroi/ui-engine-rule-components build:flow 2>&1 | tail -10`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(flow-designer): full dark mode with theme token system across all components"
```

---

## Chunk 4: Final Integration + Build Verification

### Task 8: Clean up old static styles and verify full build

**Files:**
- Modify: `src/components/rule-flow/MuRuleFlowEditor.tsx`

- [ ] **Step 1: Remove unused static style constants**

Delete the old non-themed versions that have been replaced:
- `MCanvasPanelStyle` (line 1708)
- `MLightThemeStyle`, `MDarkThemeStyle` (line 1723-1724)
- `MSidebarSectionStyle` (line 1757)
- `MSidebarSectionHeaderStyle` (line 1772)
- `MDependencyOverlayStyle` (line 1896)
- `MDependencyOverlayItemStyle` (line 1928)
- `MDeleteButtonStyle` (line 1887)
- `MPublishDialogBackdropStyle` (line 1943)
- `MPublishDialogStyle` (line 1954)

Keep the static ones that don't need theme awareness (layout-only styles like `MEditorShellStyle`, `MSidebarSectionBodyStyle`, etc.).

- [ ] **Step 2: Run full build**

Run: `cd D:/sources/Core/muonroi-ui-engine && npm run -w @muonroi/ui-engine-rule-components build 2>&1 | tail -10`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run tests**

Run: `cd D:/sources/Core/muonroi-ui-engine && npm run -w @muonroi/ui-engine-rule-components test 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(flow-designer): remove unused static styles replaced by themed versions"
```

---

### Task 9: Visual verification with Playwright

- [ ] **Step 1: Navigate to Rule Studio and capture screenshot**

Use Playwright to navigate to `http://localhost:9000/tenant/{id}/rule-studio`, take screenshot to verify:
- Node icons visible
- Edge colors working
- Palette icons + descriptions visible
- Overlay collapsible

- [ ] **Step 2: Test dark mode** (if available via prop)

Toggle theme to dark, capture screenshot to verify dark mode rendering.

- [ ] **Step 3: Test keyboard shortcuts**

Verify Ctrl+Z, Escape, Delete key work correctly.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(flow-designer): complete UX improvements — icons, dark mode, edge colors, shortcuts, collapsible overlay"
```
