# Phase 9.3 — WS-C PDF Designer (RESEARCH)

**Researched:** 2026-05-29
**Domain:** React package scaffolding, SignalR, license gate, PROFILE-V1 validation, 9.2 REST contract
**Confidence:** HIGH — all findings read directly from source; zero web-search assumptions

---

## 1. `m-ui-engine-rule-components` Package Shape (Mirror Target)

### 1.1 Directory Tree (`src/`)

```
packages/m-ui-engine-rule-components/
├── package.json
├── tsconfig.json
├── vite.config.ts                  ← single config (no vite.flow / vite.trace variants exist)
└── src/
    ├── index.ts                    ← public barrel
    ├── models.ts                   ← all domain DTOs
    ├── registry.ts                 ← customElements.define() side-effect imports
    ├── components/
    │   ├── cep/
    │   ├── decision-table/
    │   ├── feel/
    │   ├── nrules/
    │   ├── result-panel/
    │   ├── rule-flow/              ← MuRuleFlowEditor.tsx lives here
    │   │   ├── dry-run/
    │   │   ├── expression-editor/
    │   │   └── version-selector/
    │   ├── rule-test/
    │   ├── shared/
    │   └── trace-viewer/
    ├── hooks/
    │   └── useRuleFlowHistory.ts
    ├── license/
    │   └── m-commercial-guard.ts
    ├── models/                     (dist only — source is models.ts flat file)
    ├── runtime/
    │   └── request-context.ts
    ├── services/
    │   ├── connector-service.ts
    │   ├── feel-service.ts
    │   ├── rule-catalog-service.ts
    │   ├── rule-engine-api.ts
    │   ├── rule-flow-contract-service.ts
    │   ├── schema-notifier.ts
    │   └── trace-api.ts
    ├── store/
    └── utils/
```

**IMPORTANT — vite config count:** PLAN.md references `vite.flow.config.ts` and
`vite.trace.config.ts` as separate files. They **do not exist** in the repo. There is exactly one
`vite.config.ts`. The `build:flow` script in `package.json` simply calls
`vite build -c vite.flow.config.ts` — this will fail unless Wave A creates the file.
The `build` script in `package.json` chains:
`npm run -w @muonroi/ui-engine-core build && vite build && vite build -c vite.trace.config.ts && vite build -c vite.flow.config.ts && tsc -p tsconfig.json --emitDeclarationOnly`

**Implication for pdf-designer:** Do NOT copy the multi-config chain. Use a single `vite.config.ts`
producing one ESM output. The rule-components chain pre-dates any simplification; pdf-designer
starts clean.

### 1.2 `package.json` (verified)

| Field | Value |
|-------|-------|
| `name` | `@muonroi/ui-engine-rule-components` |
| `version` | `0.1.22` |
| `type` | `"module"` |
| `main` | `dist/muonroi-rule-components.esm.js` |
| `types` | `dist/index.d.ts` |
| `exports["."].import` | `./dist/muonroi-rule-components.esm.js` |
| `exports["."].types` | `./dist/index.d.ts` |
| `files` | `["dist"]` |

**Scripts:**
```json
"build":      "npm run -w @muonroi/ui-engine-core build && vite build && vite build -c vite.trace.config.ts && vite build -c vite.flow.config.ts && tsc -p tsconfig.json --emitDeclarationOnly",
"build:flow": "vite build -c vite.flow.config.ts",
"test":       "vitest run --coverage"
```

**Key dependencies (direct):**

| Package | Declared version |
|---------|-----------------|
| `@codemirror/state` | `^6.6.0` |
| `@codemirror/view` | `^6.40.0` |
| `@dnd-kit/core` | `^6.3.0` |
| `@microsoft/signalr` | `^8.0.0` |
| `@xyflow/react` | `^12.9.3` |
| `monaco-editor` | `^0.52.0` |
| `react` / `react-dom` | `^18.3.1` |
| `zustand` | `^5.0.0` |
| `lit` | `^3.2.0` |

**peerDependencies:** `@muonroi/ui-engine-core >= 0.1.0`

**devDependencies (test/build):**
`vitest ^2.1.8`, `@vitest/coverage-v8 ^2.1.9`, `@testing-library/react ^16.3.0`,
`happy-dom ^15.10.2`, `jsdom ^29.0.0`, `vite ^6.0.0`, `typescript ^5.7.0`

### 1.3 TypeScript Config

`tsconfig.json` extends `../../tsconfig.base.json` then adds:
- `"rootDir": "src"`, `"outDir": "dist"`
- `"experimentalDecorators": true`, `"useDefineForClassFields": false`
- `"jsx": "react-jsx"`, `"lib": ["ES2022", "DOM"]`, `"types": ["vite/client"]`

`tsconfig.base.json` (workspace root):
`target: ES2022`, `module: ES2022`, `moduleResolution: Bundler`, `strict: true`,
`declaration: true`, `declarationMap: true`, `sourceMap: true`.

### 1.4 Vite Config (actual, single file)

```ts
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MuonroiRuleComponents",
      formats: ["es", "iife"],
      fileName: (format) =>
        format === "iife" ? "muonroi-rule-components.iife.js" : "muonroi-rule-components.esm.js"
    },
    rollupOptions: {
      external: ["@muonroi/ui-engine-core"],
      output: {
        globals: { "@muonroi/ui-engine-core": "MuonroiUiEngineCore" },
        assetFileNames: (chunkInfo) =>
          chunkInfo.name?.endsWith(".css") ? "muonroi-rule-components.css" : "assets/[name]-[hash][extname]"
      }
    }
  }
});
```

**For pdf-designer** mirror this exactly, substituting name/entry/output file names.
The `external` array must include `@muonroi/ui-engine-core`. No other peer deps to
externalize for the initial scaffold.

### 1.5 Build Pipeline

1. Build `@muonroi/ui-engine-core` (workspace dep) first.
2. `vite build` → ESM + IIFE bundles.
3. `tsc -p tsconfig.json --emitDeclarationOnly` → `.d.ts` files in `dist/`.

**For pdf-designer**: single `vite build && tsc --emitDeclarationOnly` is sufficient.
Omit the multi-config chain.

### 1.6 `src/index.ts` — Public Exports

```ts
import "./registry.js";          // side-effect: customElements.define() calls
export * from "./models.js";
export * from "./registry.js";
export * from "./services/rule-engine-api.js";
export * from "./services/feel-service.js";
export * from "./services/trace-api.js";
export * from "./services/rule-flow-contract-service.js";
export * from "./services/rule-catalog-service.js";
export * from "./services/schema-notifier.js";
export * from "./services/connector-service.js";
export * from "./license/m-commercial-guard.js";
export * from "./runtime/request-context.js";
export * from "./components/rule-flow/MuRuleFlowEditor.js";
export * from "./store/decision-table-store.js";
export * from "./store/rule-engine-store.js";
export * from "./store/connector-store.js";
export { MuRuleTraceViewerReact } from "./components/trace-viewer/MuRuleTraceViewer.js";
export { MuRuleResultPanelReact } from "./components/result-panel/MuRuleResultPanel.js";
```

**pdf-designer index.ts analog:**
```ts
import "./register-pdf-template.js";
export * from "./models.js";
export * from "./register-pdf-template.js";
export * from "./services/PdfTemplateApiClient.js";
export * from "./services/PdfTemplateChangeSubscription.js";
export * from "./runtime/request-context.js";
export * from "./components/pdf-template/MuPdfTemplateDesigner.js";
```

---

## 2. `MuRuleFlowEditor.tsx` Shape and Dependencies

### 2.1 Component Signature (verified from source)

```ts
export interface MuRuleFlowEditorProps {
  graph: MRuleFlowGraph;               // REQUIRED — data passed in as prop
  onGraphChange?: (graph: MRuleFlowGraph) => void;  // callback to parent
  readOnly?: boolean;
  theme?: "light" | "dark";
  height?: number | string;
  apiBaseUrl?: string;                  // base URL for contract/version API calls
  catalogApiBase?: string;
  tenantId?: string;                    // tenant header injected from prop
  workflowCode?: string;
  onPublish?: (graph: MRuleFlowGraph) => Promise<void> | void;  // submit callback
  licenseStatus?: "licensed" | "trial" | "unlicensed";
  showHeader?: boolean;
  version?: number | null;
  onVersionChange?: (version: number | null) => void;
  editorRoot?: Document | ShadowRoot;   // for Lit/Shadow DOM style injection
}
```

### 2.2 How It Receives Data + Auth

- `graph` prop → initial data; parent owns the canonical state.
- `apiBaseUrl` + `tenantId` → passed as props, used to construct service instances via `useMemo`.
- Auth token: NOT passed as a prop to `MuRuleFlowEditor` itself — the `MRuleEngineApi`
  class accepts `getAccessToken?: () => string | null` in its constructor, but the
  `MuRuleFlowEditor` instantiates `MRuleEngineApi` and `MRuleFlowContractService` without
  passing a token factory — only `apiBaseUrl` + `tenantId` are threaded.
- Global headers (Bearer token) are injected via `MConfigureRuleComponentRuntime()` at
  app startup (see §5 REST client convention). The component itself never calls this — the
  host app does.

### 2.3 How It Submits Changes

- **Live edits:** calls `onGraphChange?.(normalized)` on every node/edge mutation (debounced
  300 ms for text fields, immediate for structural changes).
- **Publish:** calls `onPublish?.(graph: MRuleFlowGraph)` when the user explicitly triggers
  publish. The component validates before calling.
- There is NO internal REST call to save a ruleset inside the component. All persistence is
  the parent's responsibility via callbacks.

**Mirror implication for `MuPdfTemplateDesigner`:** Same pattern — `template` prop in,
`onTemplateChange` callback out, `onSubmit` for submit-for-approval. Designer does not call
`PdfTemplateApiClient` internally; the host page drives saves.

### 2.4 Nature of the Editor: WYSIWYG vs Form-Based

**`MuRuleFlowEditor` is a full WYSIWYG visual canvas** — it uses `@xyflow/react` (ReactFlow)
for a drag-and-drop node graph, with an inspector sidebar for per-node property editing using
CodeMirror. Nodes are positioned spatially; edges connect them.

**Verdict for Open Question 1:** `MuPdfTemplateDesigner` must NOT replicate this canvas
approach. A PDF template is HTML+CSS, not a node graph. The correct v1 surface is a
**structured JSON-edit form** (field-by-field template property editor) or a
**split-pane Monaco/CodeMirror HTML editor** with a live preview pane. WYSIWYG drag-drop
is Phase 9.x scope per PLAN.md. Recommendation: **Monaco-backed HTML editor** (Monaco is
already in the dependency tree via rule-components) with a read-only rendered preview iframe.
This requires only adding a `<textarea>` or Monaco instance — no xyflow dependency.

### 2.5 Sub-Components and Hooks Used

Key internal hooks:
- `useRuleFlowHistory(initialGraph)` — undo/redo reducer (mirror as `usePdfTemplateHistory`)
- `useMemo` service construction (no custom hooks for API — plain class instances)

---

## 3. SignalR Consumer Pattern (`m-ui-engine-signalr`)

### 3.1 Package Summary

| Field | Value |
|-------|-------|
| `name` | `@muonroi/ui-engine-signalr` |
| `version` | `0.1.22` |
| `dependencies` | `@microsoft/signalr ^8.0.7`, `@muonroi/ui-engine-core workspace:^` |
| `build` | `tsc -p tsconfig.json` (TypeScript only, no Vite) |

### 3.2 API Surface (complete — single exported class)

```ts
export class MUiEngineSignalRSchemaWatcher implements MUiEngineSchemaWatcher {
  constructor(
    private readonly mHubUrl: string,               // full hub URL
    private readonly mGetAccessToken?: () => string | null,
    private readonly mGetTenantId?: () => string | null
  ) {}

  public MSubscribe(onChanged: (event: MUiEngineSchemaChangedEvent) => void): () => void
  // Returns unsubscribe function
}
```

- Builds a `HubConnectionBuilder` with `withUrl(...)` passing `accessTokenFactory` +
  `"X-Tenant-Id"` header.
- Calls `withAutomaticReconnect()`.
- Listens on method `"SchemaChanged"`.
- Invokes `"SubscribeToSchemaChanges"` after connect.
- Returns a cleanup function that invokes `"UnsubscribeFromSchemaChanges"` + stops connection.

### 3.3 Is it Hub-Agnostic or RuleSetChangeHub-Specific?

**Hub-agnostic by construction.** The class accepts any `mHubUrl` string. The method name
it subscribes to (`"SchemaChanged"`) is its own concern — but the URL it connects to is
caller-supplied. The class does NOT embed the `/hubs/ruleset-changes` path.

**However**, the SCHEMA it speaks to (`SchemaChanged` / `SubscribeToSchemaChanges`) is the
schema watcher for UI Engine schema updates — it is NOT the same as the `TemplateChanged`
event on `RuleSetChangeHub` from 9.2.

### 3.4 Critical Finding — `MUiEngineSignalRSchemaWatcher` Cannot Be Reused As-Is

The 9.2 hub (`RuleSetChangeHub` at `/hubs/ruleset-changes`) broadcasts method name
`"TemplateChanged"` (per VERIFICATION.md W5). `MUiEngineSignalRSchemaWatcher` subscribes
to `"SchemaChanged"` and invokes `"SubscribeToSchemaChanges"`. These are different methods.

**Recommendation for `PdfTemplateChangeSubscription`:** Do NOT subclass or reuse
`MUiEngineSignalRSchemaWatcher`. Instead, write a standalone class using
`@microsoft/signalr` (already in the dependency tree) that connects to
`/hubs/ruleset-changes`, subscribes to `"TemplateChanged"`, and exposes a typed
`MSubscribe(onChanged: (event: TemplateChange) => void): () => void` interface. Mirror the
same constructor signature (hubUrl, getAccessToken, getTenantId) and connection pattern.

**No existing consumer** of `MUiEngineSignalRSchemaWatcher` for `TemplateChanged` was found
in rule-components.

---

## 4. Capability / License Gate

### 4.1 What Exists

The license gate in `m-ui-engine-rule-components` is implemented via two utilities in
`src/license/m-commercial-guard.ts`:

```ts
export function MCanRenderCommercialFeature(featureKey: string): boolean
export function MRenderCommercialLicenseGate(featureKey: string, pricingUrl?): TemplateResult | null
```

`MCanRenderCommercialFeature` delegates to `MLicenseVerifier.hasAnyFeature(candidates)` where
candidates are the package-level keys plus the resolved `featureKey` aliases.

There is NO `<RequireCapability>` React component or `useCapability` hook in the repo.
The existing gate is a utility function that returns a Lit `TemplateResult` (for Web Components).

**PLAN.md references `<RequireCapability key="pdf.designer">` — this component does not exist
and must be created in Wave C as part of U7.**

### 4.2 How Capability Key Is Checked

`MLicenseVerifier` (in `@muonroi/ui-engine-core`) reads claims from the JWT activation proof:
- Looks for `features`, `allowedFeatures`, or `capabilities` array claim.
- `hasFeature(key)` checks if the key (lowercased) is in the features array. `"*"` wildcard
  grants all.
- `hasAnyFeature(candidates)` returns true if any candidate matches.

The entitlement claims source is the JWT activation proof passed to
`MLicenseVerifier.initialize(activationProof)` at host-app startup.

### 4.3 React Gate Pattern for pdf-designer (recommended)

Since the existing gate is Lit-oriented, Wave C must write a React wrapper:

```ts
// src/license/RequireCapability.tsx
import React from "react";
import { MCanRenderCommercialFeature } from "./m-commercial-guard.js";
// Re-export the guard function from rule-components OR duplicate only the React wrapper
// and import MLicenseVerifier from @muonroi/ui-engine-core directly.

export function RequireCapability({
  featureKey,
  children,
  fallback
}: {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.JSX.Element {
  if (!MCanRenderCommercialFeature(featureKey)) {
    return <>{fallback ?? <LockedFeatureStub featureKey={featureKey} />}</>;
  }
  return <>{children}</>;
}
```

The `featureKey` for the Designer is `"pdf.designer"`. The aliases map does NOT yet include
`"pdf.designer"` — it must be added in `m-commercial-guard.ts` (or a new pdf-designer
equivalent) in Wave C.

---

## 5. REST Client Convention

### 5.1 Where REST Calls Live

`packages/m-ui-engine-rule-components/src/services/rule-engine-api.ts` — the primary API
client class (`MRuleEngineApi`). Contract lookups are in `rule-flow-contract-service.ts`.

**Mirror target for pdf-designer:**
`packages/m-ui-engine-pdf-designer/src/services/PdfTemplateApiClient.ts`

### 5.2 Auth Header Construction

**Pattern from `MRuleEngineApi`:**

```ts
private MBuildInit(init: RequestInit): RequestInit {
  const headers = MBuildRuleComponentHeaders(init.headers, { tenantId: this.mTenantId });
  const token = this.mGetAccessToken?.();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return { ...init, headers };
}
```

**`MBuildRuleComponentHeaders`** (in `runtime/request-context.ts`):
1. Applies headers from `MConfigureRuleComponentRuntime({ headers, mGetHeaders })` —
   the global runtime config set by the host app.
2. Applies `x-tenant-id` header from prop override > `mGetTenantId()` > `tenantId` field.
3. Injects `X-Correlation-Id` (UUID) if absent.

**Constructor signature to mirror:**
```ts
export interface MPdfTemplateApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  getAccessToken?: () => string | null;
  tenantId?: string;
}
```

### 5.3 Base URL Configuration

`MRuleEngineApi` normalizes `baseUrl`:
- Strips trailing `/`
- If the URL ends with `/api/v1/control-plane`, strips `/control-plane` (backward compat)

For pdf-designer, the base URL should be the control-plane API root
(e.g., `https://host/api/v1/control-plane`) and paths are appended as
`/pdf-templates`, `/pdf-templates/{id}/versions`, etc.

No URL normalization needed for pdf-designer — the caller provides the correct base.

---

## 6. Workspace + pnpm Conventions

### 6.1 `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
```

All directories under `packages/` are automatically included. Adding
`packages/m-ui-engine-pdf-designer/` requires no change to this file.

### 6.2 Process for Adding a New Package

1. Create `packages/m-ui-engine-pdf-designer/` with `package.json`.
2. Package name: `@muonroi/ui-engine-pdf-designer`.
3. Reference `@muonroi/ui-engine-core` as `"devDependencies": { "@muonroi/ui-engine-core": "workspace:^" }`
   and `"peerDependencies": { "@muonroi/ui-engine-core": ">=0.1.0" }`.
4. Root `package.json` uses `"workspaces": ["packages/*"]` — this is the npm workspaces
   format (not pnpm-specific fields). The new package is picked up automatically.
5. Run `pnpm install` from workspace root to hoist deps and create symlinks.

### 6.3 Build Orchestration

Root `package.json` scripts:
```json
"build": "npm run build -ws --if-present",
"test":  "npm run test -ws --if-present",
"lint":  "npm run lint -ws --if-present"
```

`-ws --if-present` runs the script in all packages that define it. The new package's
`build` script will be included automatically in `pnpm -w build`.

Build dependency ordering: rule-components' `build` script explicitly runs
`npm run -w @muonroi/ui-engine-core build` first. For pdf-designer, include the same
preamble in the `build` script to guarantee core is compiled before the designer bundle.

---

## 7. PROFILE-V1 Validation Hook for the Designer

### 7.1 No Standalone JSON Schema Published

`PROFILE-V1.md` does NOT reference any exported JSON schema file. The profile is documented
as a human-readable spec and enforced by `LegacyPrintPolicy.cs` in C#. There is no
`profile-v1.schema.json` artifact in the building-block repo.

**Client-side validation must be hand-rolled as a lint subset (not a schema validator).**

### 7.2 Server-Side Validation Location

`D:\sources\Core\muonroi-building-block\src\Muonroi.Pdf.Governance\Policies\LegacyPrintPolicy.cs`

Policy ID: `legacy-print-v1`. The policy runs three passes:
1. **Stylesheet AST walk:** catches `@import` external, `@keyframes`, `transition`.
2. **Computed style per element:** catches `display:flex/grid`, `position:fixed/sticky`,
   `transform`, `background-gradient`.
3. **HTML element security:** catches `<script>`, dangerous `<a href>` schemes.

Size limits: max HTML bytes = 512 KB, max element count = 5 000, max DOM depth = 50.

### 7.3 Recommended Client-Side Lint Subset

The Designer should surface lint warnings in the editor gutter (not block save) for a
subset that is fast to detect via regex/string scan on the raw HTML string. Full validation
runs server-side on submit.

**Lint rules to implement client-side (string/regex scan on raw HTML):**

| Violation ID | Detection Pattern | Severity in UI |
|---|---|---|
| `forbidden.script-element` | `/<script[\s>]/i` | Error (block submit) |
| `forbidden.link.scheme` | `href\s*=\s*["']javascript:/i`, `href\s*=\s*["']file:/i` | Error |
| `forbidden.import.external` | `@import\s+["']?https?://` | Error |
| `forbidden.display.flex` | `display\s*:\s*(?:inline-)?flex` | Warning |
| `forbidden.display.grid` | `display\s*:\s*(?:inline-)?grid` | Warning |
| `forbidden.position.fixed` | `position\s*:\s*fixed` | Warning |
| `forbidden.css-animation` | `@keyframes\s` | Warning |
| `forbidden.background.gradient` | `(?:linear|radial)-gradient\(` | Warning |
| Size guard | `html.length > 524288` (512 KB) | Warning (pre-submit) |

Errors block the "Submit for Approval" action. Warnings display in a banner but allow save.

---

## 8. 9.2 Endpoint Contract (Verbatim from VERIFICATION.md W4)

### 8.1 11-Endpoint Table

| Route | Verb | Policy |
|-------|------|--------|
| `/api/v1/control-plane/pdf-templates` | GET | `cp.viewer` |
| `/api/v1/control-plane/pdf-templates/{id}` | GET | `cp.viewer` |
| `/api/v1/control-plane/pdf-templates` | POST | `cp.admin` |
| `/api/v1/control-plane/pdf-templates/{id}/versions` | GET | `cp.viewer` |
| `/api/v1/control-plane/pdf-templates/{id}/versions/{version}` | GET | `cp.viewer` |
| `/api/v1/control-plane/pdf-templates/{id}/versions` | POST | `cp.admin` |
| `/api/v1/control-plane/pdf-templates/{id}/versions/{version}` | PUT | `cp.admin` |
| `/api/v1/control-plane/pdf-templates/{id}/versions/{version}:submit-for-approval` | POST | `cp.admin` |
| `/api/v1/control-plane/pdf-templates/{id}/versions/{version}:approve` | POST | `cp.approver` |
| `/api/v1/control-plane/pdf-templates/{id}/versions/{version}:reject` | POST | `cp.approver` |
| `/api/v1/control-plane/pdf-templates/{id}/versions/{version}:activate` | POST | `cp.approver` |

Note: `{id}` is a `Guid` surrogate key (not a string slug).

### 8.2 DTO Field Names (from `IPdfTemplateRegistryService.cs`)

**`PdfTemplateSummaryItem`** (returned by `GET /pdf-templates`):
```ts
interface PdfTemplateSummaryItem {
  id: string;               // Guid as string
  templateId: string;       // human-facing identifier
  name: string;
  status: PdfTemplateStatus;
  isActive: boolean;
  currentVersionId?: string; // Guid | null
  createdBy: string;
  createdAt: string;         // DateTimeOffset → ISO string
  updatedAt: string;
}
```

**`CreateDraftAsync` payload fields** (POST `/pdf-templates`):
```ts
{ tenantId, templateId, name, contentJson, contentType, createdBy }
```

**`AddDraftVersionAsync` payload** (POST `/pdf-templates/{id}/versions`):
```ts
{ contentJson, contentType, createdBy }
```

**`UpdateDraftAsync` payload** (PUT `/pdf-templates/{id}/versions/{version}`):
```ts
{ contentJson, contentType, updatedBy }
```

**Lifecycle actions** (POST `:submit-for-approval` / `:approve` / `:activate`):
```ts
{ submittedBy } / { approvedBy } / { activatedBy }
```

**Reject action** (POST `:reject`):
```ts
{ rejectedBy, reason }
```

**`PdfTemplateVersionRecord`** (returned by version endpoints — EF entity projection):
Fields include: `Id` (Guid), `TemplateId` (FK Guid), `Version` (int), `ContentJson`,
`ContentType`, `Status` (PdfTemplateStatus enum), plus lifecycle actor columns.

**`PdfTemplateStatus` enum values** (from VERIFICATION.md W2):
`Draft`, `PendingApproval`, `Approved`, `Rejected`, `Active`

### 8.3 SignalR Hub

| Property | Value |
|----------|-------|
| Hub class | `RuleSetChangeHub` (reused from ruleset infra) |
| Hub URL | `/hubs/ruleset-changes` |
| Method name | `"TemplateChanged"` |
| Group keys | per-tenant group + `"all-tenants"` |
| Payload type | `Muonroi.Pdf.Enterprise.Registry.TemplateChange` |

**`TemplateChange` DTO wire shape** (inferred from VERIFICATION.md — exact C# type):
Must be confirmed against `src/Muonroi.Pdf.Enterprise/Registry/TemplateChange.cs` in
building-block. Minimum expected fields: `{ templateId, tenantId, version, changeType }`.

---

## 9. Open Questions — Verdicts

### OQ1 — JSON-form vs WYSIWYG canvas?

**Verdict: Monaco-backed HTML/CSS editor with read-only preview.**

Evidence: `MuRuleFlowEditor` is a visual node graph for rule flows — an inappropriate model
for HTML template editing. The Designer's data type is an HTML string, not a graph. Monaco
is already a dependency of rule-components (bundled). A split-pane code editor + iframe
preview costs zero new dependencies and matches v1 scope. WYSIWYG drag-drop layout is
explicitly out of scope (PLAN §"Out-of-scope"). The PDF template `contentJson` field stored
server-side is a JSON envelope containing an HTML string.

### OQ2 — PROFILE-V1 validation entry point?

**Verdict: No public JSON schema exists. Client-side lint only; server validates on submit.**

Evidence: `PROFILE-V1.md` declares no exported schema artifact. `LegacyPrintPolicy.cs`
runs C# AngleSharp passes that cannot be replicated in JS without shipping a full CSS
parser. The correct pattern is: Designer runs the regex-based lint subset (§7.3 above) for
fast UX feedback, then on "Submit for Approval" the API call returns HTTP 422 with
`PdfPolicyViolationException` details if server-side validation fails.

### OQ3 — SignalR hub abstraction?

**Verdict: `MUiEngineSignalRSchemaWatcher` cannot be reused for TemplateChanged.**

Evidence: The existing class subscribes to `"SchemaChanged"` / `"SubscribeToSchemaChanges"`.
The 9.2 hub broadcasts `"TemplateChanged"`. Write a new
`PdfTemplateChangeSubscription` class using `@microsoft/signalr` directly, connecting to
`/hubs/ruleset-changes`, listening on `"TemplateChanged"`. Mirror the constructor signature
`(hubUrl, getAccessToken?, getTenantId?)` for consistency. This is a small class (< 50
lines, identical connection-lifecycle pattern).

### OQ4 — Versioning: `0.1.0` or `0.1.22`?

**Verdict: Start at `0.1.0`.**

Evidence: The workspace root `package.json` is at `0.1.22` and all existing packages are
`0.1.22`. However, the PLAN states `muonroi-ui-engine-pdf-designer-0.1.0.tgz` as the
target pack output (SC6, U9). Commercial packages may version independently. Starting at
`0.1.0` is the stated intent. The pnpm workspace does not enforce version lockstep across
packages. Use `"0.1.0"` for the initial release.

### OQ5 — Auth/tenant token plumbing?

**Verdict: Two-tier pattern — mirror exactly.**

Evidence:
1. **Global config (at app startup):** Host app calls
   `MConfigureRuleComponentRuntime({ headers: { Authorization: "Bearer ..." }, mGetTenantId: () => tenantId })`
   once. `MBuildRuleComponentHeaders` picks this up for every request.
2. **Per-component prop:** `tenantId` passed as prop to the Designer → forwarded to
   `PdfTemplateApiClient` constructor as `options.tenantId`. Overrides global when set.
3. **Bearer token per request:** `PdfTemplateApiClient` accepts `getAccessToken?: () => string | null`
   in its constructor. The token is applied in `MBuildInit` via `headers.set("Authorization", "Bearer " + token)`.

The Designer component itself does not own the token — the host app provides it via either
the global runtime config or the `getAccessToken` prop forwarded to the client. Mirror the
exact `MRuleEngineApi` constructor options shape.

---

## 10. Package Scaffold for Wave A

Based on the research, the complete `package.json` for `m-ui-engine-pdf-designer`:

```json
{
  "name": "@muonroi/ui-engine-pdf-designer",
  "version": "0.1.0",
  "description": "Muonroi PDF template designer React component",
  "type": "module",
  "main": "dist/muonroi-pdf-designer.esm.js",
  "types": "dist/index.d.ts",
  "license": "SEE LICENSE IN LICENSE-COMMERCIAL",
  "exports": {
    ".": {
      "import": "./dist/muonroi-pdf-designer.esm.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "LICENSE-COMMERCIAL"],
  "scripts": {
    "build": "npm run -w @muonroi/ui-engine-core build && vite build && tsc -p tsconfig.json --emitDeclarationOnly",
    "test": "vitest run --coverage"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@microsoft/signalr": "^8.0.7"
  },
  "peerDependencies": {
    "@muonroi/ui-engine-core": ">=0.1.0"
  },
  "devDependencies": {
    "@muonroi/ui-engine-core": "workspace:^",
    "@testing-library/react": "^16.3.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitest/coverage-v8": "^2.1.9",
    "happy-dom": "^15.10.2",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.8"
  }
}
```

Monaco-editor is NOT listed as a dependency — the v1 Designer may use a `<textarea>` for
the HTML editor surface to avoid the 3 MB Monaco bundle overhead. If Monaco is chosen,
add `"monaco-editor": "^0.52.0"` to dependencies (already in rule-components, so it will
be hoisted in the workspace).

---

## 11. Architecture Diagram

```
Host App
  │  MLicenseVerifier.initialize(jwt)       ← app startup
  │  MConfigureRuleComponentRuntime({...})  ← global auth/tenant
  │
  └──► <MuPdfTemplateDesigner
            template={htmlString}
            onTemplateChange={fn}
            onSubmit={fn}
            apiBaseUrl="https://..."
            tenantId="t1"
            getAccessToken={() => token}
            licenseStatus="licensed" />
            │
            ├── RequireCapability featureKey="pdf.designer"
            │     └── [gate] MLicenseVerifier.hasFeature("pdf.designer")
            │
            ├── [Editor pane]
            │     ├── Monaco / textarea (HTML string)
            │     └── Lint strip (regex scan → warning banner)
            │
            ├── [Preview pane]
            │     └── <iframe srcdoc={htmlString} /> (read-only)
            │
            ├── usePdfTemplateHistory(initialTemplate)
            │     └── useReducer — commit/undo/redo
            │
            ├── PdfTemplateApiClient
            │     ├── baseUrl, tenantId, getAccessToken
            │     ├── list / get / createDraft / updateDraft
            │     └── submit / approve / reject / activate
            │
            └── PdfTemplateChangeSubscription
                  ├── /hubs/ruleset-changes
                  ├── method: "TemplateChanged"
                  └── onChanged(event) → trigger preview refresh
```

---

## 12. Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `TemplateChange` wire DTO has fields `{templateId, tenantId, version, changeType}` | §8.3 | TypeScript model will drift from server payload |
| A2 | Monaco editor is the right choice for HTML editing surface | §9/OQ1 | Could be `<textarea>` or CodeMirror (both simpler) |
| A3 | `contentJson` field wraps the HTML string as JSON (e.g. `{ "html": "..." }`) | §8.2 | If it's a raw HTML string the DTO shape in models is wrong |

Item A3 should be confirmed by reading
`D:\sources\Core\muonroi-building-block\src\Muonroi.RuleEngine.EntityFrameworkCore\Rules\PdfTemplateVersionRecord.cs`
before Wave A creates DTOs.

---

## Sources

All findings are from direct file reads — no web search.

| File | What Was Checked |
|------|-----------------|
| `packages/m-ui-engine-rule-components/package.json` | name, version, scripts, deps |
| `packages/m-ui-engine-rule-components/vite.config.ts` | single config confirmed |
| `packages/m-ui-engine-rule-components/tsconfig.json` | compiler options |
| `packages/m-ui-engine-rule-components/src/index.ts` | public exports barrel |
| `packages/m-ui-engine-rule-components/src/components/rule-flow/MuRuleFlowEditor.tsx` | props, data flow, xyflow confirm |
| `packages/m-ui-engine-rule-components/src/hooks/useRuleFlowHistory.ts` | history hook shape |
| `packages/m-ui-engine-rule-components/src/license/m-commercial-guard.ts` | gate API |
| `packages/m-ui-engine-rule-components/src/runtime/request-context.ts` | header builder |
| `packages/m-ui-engine-rule-components/src/services/rule-engine-api.ts` | REST client pattern |
| `packages/m-ui-engine-rule-components/src/services/rule-flow-contract-service.ts` | service pattern |
| `packages/m-ui-engine-signalr/src/index.ts` | SignalR class full source |
| `packages/m-ui-engine-signalr/package.json` | version, deps |
| `packages/m-ui-engine-core/src/license/MLicenseVerifier.ts` | hasFeature, initialize |
| `pnpm-workspace.yaml` | package glob |
| `package.json` (root) | workspace scripts |
| `tsconfig.base.json` | base TS config |
| `D:\sources\Core\muonroi-building-block\PROFILE-V1.md` | reject list §4, no JSON schema |
| `D:\sources\Core\muonroi-building-block\src\Muonroi.Pdf.Governance\Policies\LegacyPrintPolicy.cs` | server validation passes |
| `D:\sources\Core\muonroi-control-plane\.planning\phases\09.2-ws-b-control-plane\VERIFICATION.md` | 11 endpoints, SignalR hub name/method |
| `D:\sources\Core\muonroi-control-plane\src\Muonroi.ControlPlane.Api\Services\PdfTemplates\IPdfTemplateRegistryService.cs` | DTO field names |
