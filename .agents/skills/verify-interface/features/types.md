---
covers:
  - src/http-result.ts
  - src/controller.ts
  - src/route-registry.ts
  - src/proxies.ts
  - src/parameter-decorators.ts
  - src/route-decorators.ts
  - src/routes.ts
  - src/index.ts
  - src/body.ts
  - src/guards.ts
docs:
  - docs/3.http-handling.md
  - docs/2.controllers.md
  - docs/4.parameters.md
journeys:
  - declared-shapes
---

# Declared types

A TypeScript author compiles against the packed declarations: `HTTPBody`, `ControllerClass`, `RouteHandler`, the provider and modifier types and the decorators.

## Sub-features

- `declared-shapes`: a probe with the documented shapes compiles, and a probe with ten documented misuses (an `interface` as `HTTPBody`, an index into a bare controller instance, `RegisterRoute` without `controller`, `@Result` and `@WriteStream` on a property, an unknown handler mode, a non-origin `AllowedOrigin`, a string status, and a `@Parameter(name, "query")` property and handler argument typed `string`) gets exactly ten errors, one per line.

## How to get to it (user POV)

- `const body: HTTPBody = { ...value }`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" types
```

## Gotchas

- The probe compiles with `experimentalDecorators`, as the docs require.
