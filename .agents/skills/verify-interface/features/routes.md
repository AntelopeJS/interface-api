---
covers:
  - src/route-decorators.ts
  - src/routes.ts
docs:
  - docs/2.controllers.md
journeys:
  - route-locations
  - route-errors
---

# Route decorators

A module author maps a controller method to an endpoint with `@Get`, `@Post`, `@Put`, `@Delete` or `@Route`, and adds hooks with `@Prefix`, `@Postfix`, `@Monitor` and `@WebsocketHandler`.

## Sub-features

- `route-locations`: the HTTP method, handler mode, full location (method name when omitted, repeated slashes collapsed) and priority each decorator registers, and that the decorator returns nothing a class can see.
- `route-errors`: a class `Controller` did not build, a descriptor with no method and a symbol key with no location each throw a `TypeError` with the documented message, and nothing is registered.

## How to get to it (user POV)

- `@Get(":id")`, `@Prefix("get", "x", HandlerPriority.HIGHEST)`, `@WebsocketHandler("chat")`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" routes
```

## Gotchas

- `@Get("")` registers the location `/users/` with a trailing slash, which the implementation matches as the controller root.
- The symbol key case is undocumented in `docs/`; it is a check of the TypeError the code raises.
