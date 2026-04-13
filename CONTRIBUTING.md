# Contributing to muonroi-ui-engine

This repository is the TypeScript and web-component side of the Muonroi ecosystem. Contributions are welcome, but changes should preserve the public OSS/commercial boundary and keep the mirrored control-plane packages in sync.

## Before You Start

- Read [README.md](./README.md)
- Read the UI engine guides on https://docs.muonroi.com
- Default branch for this repo is `develop`

## Local Prerequisites

- Node.js 20 or newer
- `pnpm`

## Install, Test, Build

```bash
pnpm install
pnpm test
pnpm build
```

If you changed packages mirrored into the control-plane repository, run the sync script there after your change lands.

## Contribution Rules

- Keep OSS packages free of commercial implementation references.
- Preserve web-component boundaries even when a React wrapper exists.
- Add or update docs when behavior or APIs change.
- Include tests for new component behavior and serialization logic.
