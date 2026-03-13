# muonroi-ui-engine — Deep Map

> Complete file-level map. Agents should read this instead of exploring the repo.

---

## Package Overview

| Package | npm Name | Tier | Purpose |
|---------|----------|------|---------|
| m-ui-engine-core | @muonroi/ui-engine-core | OSS | Base runtime, contracts, manifest, adapters |
| m-ui-engine-react | @muonroi/ui-engine-react | OSS | React wrappers via @lit/react |
| m-ui-engine-angular | @muonroi/ui-engine-angular | OSS | Angular routing/menu mappers |
| m-ui-engine-primeng | @muonroi/ui-engine-primeng | OSS | PrimeNG component mapping |
| m-ui-engine-rule-components | @muonroi/ui-engine-rule-components | Commercial | Decision table, flow designer, FEEL, trace |
| m-ui-engine-rule-components-primeng | @muonroi/ui-engine-rule-components-primeng | Commercial | PrimeNG rule component adapter |
| m-ui-engine-signalr | @muonroi/ui-engine-signalr | Commercial | SignalR schema watcher |
| m-ui-engine-sync | @muonroi/ui-engine-sync | Commercial | CLI sync tool |

---

## 1. m-ui-engine-core (`packages/m-ui-engine-core/src/`)

| File | Export | Purpose |
|------|--------|---------|
| contracts.ts | `MUiEngineManifest`, `MUiEngineScreen`, `MUiEngineAction`, `MUiEngineDataSource`, `MUiEngineNavigationGroup`, `MUiEngineComponentRegistry` | Root UI engine schema (v1/v2) |
| runtime.ts | `MUiEngineRuntime` | Core runtime: `MResolveScreenByRoute()`, `MCanRenderNode()`, `MCanExecuteAction()` |
| bootstrap.ts | `MUiEngineBootstrapper`, `MUiEngineSchemaWatcher`, `MUiEngineManifestProvider` | Bootstrap orchestrator, caching, schema watching, telemetry |
| http.ts | `MUiEngineApiClient`, `MCreateEngineFetch()` | HTTP client for manifest loading, ETag caching |
| catalog.ts | `MUiEngineCatalogClient` | Loads API descriptors, rules, bindings, graph |
| adapters.ts | `MDefaultUiRenderAdapter`, `MBuildRenderPlan()`, `MBuildSlottedRenderPlan()` | Component type → tag mapping, layout planning |
| auth-profile.ts | Auth types | Token source, tenant header key |
| validation.ts | Validators | Schema validation helpers |
| license/MLicenseVerifier.ts | `MLicenseVerifier` | License key verification (commercial gate) |

---

## 2. m-ui-engine-react (`packages/m-ui-engine-react/src/`)

| File | Export | Purpose |
|------|--------|---------|
| index.ts | `MCreateReactUiModel()` | Converts manifest to React-friendly structure |
| | `MLoadRuleEngineCustomElements()` | Bootstraps rule-components (async) |
| | `MuDecisionTableReact` | React-wrapped `<mu-decision-table>` |
| | `MuNRulesEditorReact` | React-wrapped `<mu-nrules-editor>` |
| | `MuCepWindowConfigReact` | React-wrapped `<mu-cep-window-config>` |
| | `MuFeelPlaygroundReact` | React-wrapped `<mu-feel-playground>` |
| | `MuRuleFlowDesignerReact` | React-wrapped `<mu-rule-flow-designer>` |

---

## 3. m-ui-engine-angular (`packages/m-ui-engine-angular/src/`)

| File | Export | Purpose |
|------|--------|---------|
| index.ts | `MMapScreensToAngularRoutes()` | Converts screens to Angular routing |
| | `MMapNavigationToAngularMenu()` | Converts nav to Angular menu |
| | `MUiEngineAngularServiceBase` | Abstract API service base |
| | `MLoadRuleEngineCustomElements()` | Bootstrap with tenant/header support |
| | `MBindCustomElementEvent()` | Event binding helper |

---

## 4. m-ui-engine-primeng (`packages/m-ui-engine-primeng/src/`)

| File | Export | Purpose |
|------|--------|---------|
| index.ts | `MPrimeNgRenderAdapter` | PrimeNG component mapping |
| | `MMapNavigationGroupsToPrimeNgMenu()` | Nav → PrimeNG menu |
| | `MMapActionsToPrimeNgButtons()` | Actions → PrimeNG buttons |

---

## 5. m-ui-engine-rule-components (`packages/m-ui-engine-rule-components/src/`) — COMMERCIAL

### Custom Elements (Lit)

| Tag | File | Purpose |
|-----|------|---------|
| `<mu-decision-table>` | components/decision-table/mu-decision-table.ts | Decision table editor: version history, diff, validation |
| `<mu-decision-table-list>` | components/decision-table/mu-decision-table-list.ts | List view of decision tables |
| `<mu-dt-header-row>` | components/decision-table/mu-dt-header-row.ts | Header row |
| `<mu-dt-data-row>` | components/decision-table/mu-dt-data-row.ts | Editable data row |
| `<mu-dt-cell>` | components/decision-table/mu-dt-cell.ts | Cell with FEEL input |
| `<mu-dt-hit-policy-selector>` | components/decision-table/mu-dt-hit-policy-selector.ts | Hit policy dropdown |
| `<mu-dt-column-config>` | components/decision-table/mu-dt-column-config.ts | Column config panel |
| `<mu-dt-version-diff>` | components/decision-table/mu-dt-version-diff.ts | Version diff viewer |
| `<mu-rule-flow-designer>` | components/rule-flow/mu-rule-flow-designer.ts | Visual flow editor (React rendered in Lit) |
| `<mu-nrules-editor>` | components/nrules/mu-nrules-editor.ts | N-Ary Rules DSL editor |
| `<mu-nrules-condition>` | components/nrules/mu-nrules-condition.ts | Condition block |
| `<mu-nrules-action>` | components/nrules/mu-nrules-action.ts | Action block |
| `<mu-cep-window-config>` | components/cep/mu-cep-window-config.ts | CEP config |
| `<mu-cep-event-stream>` | components/cep/mu-cep-event-stream.ts | CEP stream monitor |
| `<mu-feel-playground>` | components/feel/mu-feel-playground.ts | FEEL editor + autocomplete |
| `<mu-feel-autocomplete>` | components/feel/mu-feel-autocomplete.ts | Autocomplete widget |
| `<mu-rule-test-runner>` | components/testing/mu-rule-test-runner.ts | Test runner for rules |
| `<mu-rule-trace-viewer>` | components/trace-viewer/mu-rule-trace-viewer.ts | Trace/debugger log viewer |
| `<mu-rule-result-panel>` | components/results/mu-rule-result-panel.ts | Result summary panel |
| `<mu-upgrade-prompt>` | components/license/mu-upgrade-prompt.ts | License upgrade prompt |
| `<mu-quota-indicator>` | components/quota/mu-quota-indicator.ts | Tenant quota display |
| `<mu-schema-watcher>` | components/schema/mu-schema-watcher.ts | Real-time schema listener |
| `<mu-ui-engine-app>` | components/app/mu-ui-engine-app.ts | Root app container |

### Zustand Stores

| File | Store | Key Actions |
|------|-------|-------------|
| store/decision-table-store.ts | `DecisionTableEditorState` | `loadTable()`, `addRow()`, `updateCell()`, `setHitPolicy()`, `undo()`, `redo()`, `validate()`, `saveTable()`, `loadHistory()`, `loadVersionSnapshot()` |
| store/rule-engine-store.ts | `MRuleEngineStoreState` | Current screen, tier, schema staleness |

### Services (API Clients)

| File | Class | Purpose |
|------|-------|---------|
| services/rule-engine-api.ts | `MRuleEngineApi` | Decision table, NRules, CEP API (list, get, save, validate, export, history) |
| services/feel-service.ts | `MFeelService` | FEEL evaluate + autocomplete endpoints |
| services/rule-catalog-service.ts | `MRuleCatalogService` | Rule catalog query (search, filter by category) |
| services/rule-flow-contract-service.ts | `MRuleFlowContractService` | Flow/node contract schema lookup |
| services/trace-api.ts | `MRuleTraceApiClient` | Trace query, debugger enable/disable |

### Models

| File | Key Types | Purpose |
|------|-----------|---------|
| models.ts | `MDecisionTableModel`, `MDecisionTableColumn`, `MDecisionTableRow`, `MDecisionTableCell`, `MValidationError`, `MDecisionTableVersionInfo`, `MDecisionTableDiff` | Decision table structures |
| models/rule-flow.ts | `MRuleFlowGraph`, `MRuleFlowNode`, `MRuleFlowEdge`, `MRuleFlowNodeType`, `MRuleFlowEdgeType`, `MRuleFlowContractSchema`, `MRuleCatalogItem` | Flow graph + catalog |
| models/trace-models.ts | `MRuleTraceEntry`, `MRuleTracePhase`, `MRuleDebuggerStatus` | Trace viewer |
| models/result-models.ts | `MRuleResult`, `MValidationSummary` | Validation results |

### Node Types in Flow Designer

| MRuleFlowNodeType | Description |
|-------------------|-------------|
| trigger | Entry point |
| condition | FEEL guard expression |
| action | Transform/business logic |
| decision-table | DMN table evaluation |
| sub-flow | Nested flow graph |
| liquid | Liquid template |
| end | Termination |

### Edge Types

| MRuleFlowEdgeType | Description |
|-------------------|-------------|
| always | Unconditional |
| on-true | Condition passed |
| on-false | Condition failed |
| on-error | Error fallback |

### License Gating

| File | Export | Purpose |
|------|--------|---------|
| license/m-commercial-guard.ts | `MCanRenderCommercialFeature()` | Check feature key |
| | `MRenderCommercialLicenseGate()` | Render upgrade prompt if unlicensed |
| runtime/request-context.ts | `MConfigureRuleComponentRuntime()` | Configure tenant + headers |
| | `MBuildRuleComponentHeaders()` | Build auth/tenant headers |

### Registry

| File | Purpose |
|------|---------|
| registry.ts | Side-effect imports registering all custom elements |
| index.ts | Main barrel export |

---

## 6. m-ui-engine-signalr (`packages/m-ui-engine-signalr/src/`)

| File | Export | Purpose |
|------|--------|---------|
| index.ts | `MUiEngineSignalRSchemaWatcher` | Implements `MUiEngineSchemaWatcher` via SignalR hub |

---

## 7. Build & Scripts

| Script | Purpose |
|--------|---------|
| scripts/sync-ui-engine.sh | Install, build, link packages |
| scripts/parity-check.sh | Verify package parity |
| scripts/test-all.sh | Run all tests |

**Vite configs**: `vite.config.ts` (standard), `vite.flow.config.ts` (flow designer), `vite.trace.config.ts` (trace viewer)

---

## Key Patterns

- **M-prefix**: All exports use `M` prefix (e.g., `MCreateRuleEngineStore`)
- **Zustand stores**: `createStore()` from `zustand/vanilla` (framework-agnostic)
- **Lit elements**: `mu-` prefix tags, decorators for properties
- **React bridge**: `@lit/react` `createComponent()` wraps Lit → React
- **Header building**: Centralized `MBuildRuleComponentHeaders()` for tenant + correlation ID
- **Version control**: Undo/redo via `{ past: [], future: [] }`, history limit 50
