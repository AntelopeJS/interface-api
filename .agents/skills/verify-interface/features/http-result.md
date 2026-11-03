---
covers:
  - src/http-result.ts
  - src/guards.ts
docs:
  - docs/3.http-handling.md
journeys:
  - result-basics
  - result-headers
  - result-send
---

# HTTPResult

A module author sets the status, body, content type and headers of a response with `HTTPResult`, or puts it in stream mode.

## Sub-features

- `result-basics`: the constructor defaults, string bodies as `text/plain`, other bodies as JSON, `toJSON` values, the explicit content type and `setBody`.
- `result-headers`: `addHeader`, `removeHeader`, `getHeaders` creating the store and `peekHeaders` not creating it, `withHeaders` returning the same object for an `HTTPResult` and only using `defaultStatus` for a new one.
- `result-send`: `getWriteStream` defaults and idempotence, `sendResponse` and `sendHeadResponse` against a fake response, a stream piped to the response and `abortStream`.

## How to get to it (user POV)

- `return new HTTPResult(201, { id }, "application/json")`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" http-result
```

## Gotchas

- The 500 log line of `sendResponse` is not documented and not driven.
