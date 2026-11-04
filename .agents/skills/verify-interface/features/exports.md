---
covers:
  - src/index.ts
docs:
  - README.md
  - docs/1.introduction.md
journeys:
  - export-surface
---

# Export surface

A module author imports the contract from the package root. The order of the exports is the published key order of the CommonJS exports.

## Sub-features

- `export-surface`: the package root exports exactly the documented names in the published order, as writable data properties.

## How to get to it (user POV)

- `import { Controller, Get } from "@antelopejs/interface-api"`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" exports
```

## Gotchas

- Only the root is exported; the package has no subpaths.
