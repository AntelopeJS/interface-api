---
covers:
  - src/proxies.ts
docs:
  - docs/2.controllers.md
  - docs/3.http-handling.md
journeys:
  - core-calls
  - cors-calls
---

# Interface functions

A module author calls `Listen`, `GetControllerInstance`, `GetCorsConfig` and `SetCorsConfig`, which the implementing module answers through core.

## Sub-features

- `core-calls`: each of the four functions reaches the stub provider with every argument.
- `cors-calls`: `SetCorsConfig` sends the whole `CorsConfig` and `GetCorsConfig` takes no argument.

## How to get to it (user POV)

- `await SetCorsConfig({ allowedOrigins: ["https://app.example.com"] })`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" proxies
```

## Gotchas

- The driver sends JSON, so `GetControllerInstance` receives stand-ins for the class and the context. The journey proves routing and argument order, not what the implementation answers.
