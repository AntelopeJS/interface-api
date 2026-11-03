---
covers:
docs:
  - docs/1.introduction.md
journeys:
  - core-calls
  - export-surface
---

# Smoke

The fixed journeys every verdict runs, whatever the diff touches: load the packed interface next to a stub provider, call the four interface functions through core, and read the exported names in their published order.

## Sub-features

- `core-calls`: as in [proxies](proxies.md).
- `export-surface`: as in [exports](exports.md).

## How to get to it (user POV)

- A project with an implementation of `@antelopejs/interface-api` and a module that imports it.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" smoke
```

## Gotchas

- The smoke feature covers no glob, so it never marks a file as mapped.
