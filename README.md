# muonroi-ui-engine

Muonroi UI Engine is the TypeScript and web-component side of the ecosystem: core runtime adapters, framework wrappers, and the commercial rule-authoring surfaces used by the control plane.

[![CI](https://github.com/muonroi/muonroi-ui-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/muonroi/muonroi-ui-engine/actions/workflows/ci.yml)
[![License Model](https://img.shields.io/badge/license-open--core-green.svg)](https://docs.muonroi.com/docs/resources/COMMERCIAL-EDITIONS)
[![Commercial Packages](https://img.shields.io/badge/commercial-rule%20components-blue.svg)](https://docs.muonroi.com/docs/resources/COMMERCIAL-EDITIONS)

## Install

```bash
npm install
npm run build
```

## Quick Example

Bootstrap the custom elements and render the flow designer in React:

```tsx
import { MLoadRuleEngineCustomElements, MuRuleFlowDesignerReact } from "@muonroi/ui-engine-react";

await MLoadRuleEngineCustomElements({ activationProof });

<MuRuleFlowDesignerReact
  graph={{ nodes: [], edges: [], metadata: { version: 1, workflowName: "wf.orders" } }}
  apiBaseUrl="/api/v1"
  height={720}
/>;
```

That gives you the commercial flow canvas used by the control-plane dashboard while preserving the web-component boundary for non-React hosts.

## Packages

| Package | Purpose | Tier |
| --- | --- | --- |
| `@muonroi/ui-engine-core` | runtime contracts, navigation shaping, helpers | OSS |
| `@muonroi/ui-engine-react` | React wrappers for Muonroi custom elements | OSS |
| `@muonroi/ui-engine-angular` | Angular wrappers | OSS |
| `@muonroi/ui-engine-primeng` | PrimeNG integration | OSS |
| `@muonroi/ui-engine-rule-components` | decision table, FEEL, rule flow, and authoring widgets | Commercial |
| `@muonroi/ui-engine-signalr` | real-time sync helpers | Commercial |
| `@muonroi/ui-engine-sync` | sync and offline tooling | Commercial |

## Local Development

```bash
npm install
npm run test
npm run build
```

If you changed shared UI packages that are mirrored into the control-plane repo, run the sync script there after the change lands.

## Docs

- UI engine architecture: https://docs.muonroi.com/docs/guides/ui-engine/ui-engine-architecture
- Rule flow designer guide: https://docs.muonroi.com/docs/guides/ui-engine/rule-flow-designer
- Decision table widget guide: https://docs.muonroi.com/docs/guides/ui-engine/decision-table-widget

## Community

- Docs: https://docs.muonroi.com
- Issues: https://github.com/muonroi/muonroi-ui-engine/issues
- Commercial editions: https://docs.muonroi.com/docs/resources/COMMERCIAL-EDITIONS
