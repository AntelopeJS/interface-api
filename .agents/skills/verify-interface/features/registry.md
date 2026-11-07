---
covers:
  - src/route-registry.ts
  - src/routes.ts
  - src/proxies.ts
  - src/controller.ts
  - src/guards.ts
  - src/http-result.ts
docs:
  - docs/2.controllers.md
journeys:
  - registry-lifecycle
---

# Route registry

A module registers a route with a shorter life than its module through `RegisterRoute`, removes it with `UnregisterRoute` and lists registrations with `getRegisteredRoutes` and `getRegisteredRouteHandlers`.

## Sub-features

- `registry-lifecycle`: ids are consecutive numbers, the registered handler is a copy whose `module` replaces the caller's, both introspection functions return fresh arrays over shared handlers, `UnregisterRoute` removes the entry and reaches the proxy, and `HandlerPriority` has the five documented values.

## How to get to it (user POV)

- `const id = RegisterRoute({ mode, method, location, callback, parameters, properties, controller })`, then `UnregisterRoute(id)`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" registry
```

## Gotchas

- Pruning on module unload needs a module context and is not driven (see the pull request).
