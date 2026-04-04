# muonroi-ui-engine

Muonroi UI Engine is the frontend and host-integration layer of the Muonroi ecosystem: manifest-driven runtime packages, framework adapters, commercial rule-authoring surfaces, and the ASP.NET MVC bridge used by server-rendered hosts.

[![CI](https://github.com/muonroi/muonroi-ui-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/muonroi/muonroi-ui-engine/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/muonroi/muonroi-ui-engine/graph/badge.svg?branch=main)](https://codecov.io/github/muonroi/muonroi-ui-engine)
[![OSS License](https://img.shields.io/badge/license-open--core-green.svg)](https://docs.muonroi.com/docs/resources/COMMERCIAL-EDITIONS)
[![Commercial Packages](https://img.shields.io/badge/commercial-rule%20components-blue.svg)](https://docs.muonroi.com/docs/resources/COMMERCIAL-EDITIONS)

## Install

```bash
pnpm install
pnpm build
```

For the ASP.NET MVC host package:

```bash
dotnet add package Muonroi.Ui.Engine.Mvc
```

## Quick Example

Bootstrap the custom elements and render the commercial flow designer from React:

```tsx
import {
  MLoadRuleEngineCustomElements,
  MuRuleFlowDesignerReact
} from "@muonroi/ui-engine-react";

await MLoadRuleEngineCustomElements({ activationProof });

<MuRuleFlowDesignerReact
  graph={{
    nodes: [],
    edges: [],
    metadata: { version: 1, workflowName: "wf.orders" }
  }}
  apiBaseUrl="/api/v1"
  height={720}
/>;
```

On ASP.NET MVC hosts, the companion package gives you manifest loading, HTML helpers, and tag helpers for server-rendered entry points.

## Package Families

| Area | OSS packages | Commercial packages |
| --- | --- | --- |
| Core runtime | `@muonroi/ui-engine-core` | - |
| Framework adapters | `@muonroi/ui-engine-react`, `@muonroi/ui-engine-angular`, `@muonroi/ui-engine-primeng` | `@muonroi/ui-engine-rule-components-primeng` |
| Rule authoring | - | `@muonroi/ui-engine-rule-components` |
| Realtime and sync | - | `@muonroi/ui-engine-signalr`, `@muonroi/ui-engine-sync` |
| .NET host bridge | `Muonroi.Ui.Engine.Mvc` | - |

The package boundary is intentional:

- OSS packages stay usable without commercial dependencies.
- Commercial packages build on top of the OSS runtime and adapters.
- The MVC package acts as a host bridge for manifest-driven rendering in ASP.NET applications.

## What To Read First

- UI engine architecture: https://docs.muonroi.com/docs/guides/ui-engine/ui-engine-architecture
- Rule flow designer guide: https://docs.muonroi.com/docs/guides/ui-engine/rule-flow-designer
- Decision table widget guide: https://docs.muonroi.com/docs/guides/ui-engine/decision-table-widget
- Deep repo map: [REPO_DEEP_MAP.md](./REPO_DEEP_MAP.md)
- UX planning notes: [docs/superpowers/plans/2026-03-13-flow-designer-ux-improvements.md](./docs/superpowers/plans/2026-03-13-flow-designer-ux-improvements.md)
- CI coverage upload: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

## Test Coverage

Current automated coverage in this repo is concentrated on the `.NET` MVC package.

- Latest local verification: `12/12` tests passed in `Muonroi.Ui.Engine.Mvc.Tests`
- Latest local line coverage snapshot for `Muonroi.Ui.Engine.Mvc`: `76.4%`
- Latest local branch coverage snapshot for `Muonroi.Ui.Engine.Mvc`: `93.7%`
- Coverage command:

```bash
dotnet test Muonroi.Ui.Engine.sln -v minimal --collect:"XPlat Code Coverage" --results-directory ./TestResults /m:1
```

Coverage summary was generated from the local test run on `2026-03-20` from Cobertura output and is now wired for Codecov upload in CI.

## Local Development

Install and verify the TypeScript workspace:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm -r --if-present run type-check
pnpm -r --if-present run lint
pnpm test
```

Build and test the MVC package:

```bash
dotnet build Muonroi.Ui.Engine.sln -v minimal /m:1
dotnet test Muonroi.Ui.Engine.sln -v minimal --no-restore /m:1
```

If you changed UI packages that are mirrored into the control-plane repository, run the sync scripts before promoting the change downstream.

## Community

- Docs: https://docs.muonroi.com
- Issues: https://github.com/muonroi/muonroi-ui-engine/issues
- Commercial editions: https://docs.muonroi.com/docs/resources/COMMERCIAL-EDITIONS
- Pull request template: [PULL_REQUEST_TEMPLATE.md](./PULL_REQUEST_TEMPLATE.md)

## License

The repo follows an open-core model. OSS packages remain open for general runtime adoption, while commercial rule-authoring packages require Muonroi commercial licensing and activation proof in deployed environments.
