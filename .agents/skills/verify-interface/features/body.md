---
covers:
  - src/body.ts
  - src/parameter-decorators.ts
docs:
  - docs/3.http-handling.md
  - docs/4.parameters.md
journeys:
  - body-decoders
  - body-limit
---

# Request bodies

A module author reads the request body: buffered with `ReadBody` or `@RawBody`, parsed with `@JSONBody`, or streamed with `StreamBody` or `@BodyStream`.

## Sub-features

- `body-decoders`: `@JSONBody` parses an object, an array and `null`, answers undefined for an empty body, rejects invalid JSON with a `SyntaxError` and an oversized body with a 413 `HTTPResult`; `@RawBody` returns the buffer and honours its limit.
- `body-limit`: the default limit is 1 MiB, a body or a `Content-Length` over the limit rejects with 413 `Payload Too Large`, a body of exactly the limit passes, later reads reuse the pending read, and `StreamBody` has no limit and stops cleanly on an early `break`.

## How to get to it (user POV)

- `@JSONBody() body: { title: string }`, `ReadBody(context, 10 * 1024 * 1024)`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" body
```

## Gotchas

- A rejected buffered read cannot be restarted on the same consumed stream, so the journeys use a fresh request per read.
