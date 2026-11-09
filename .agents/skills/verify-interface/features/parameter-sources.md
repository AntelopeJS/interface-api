---
covers:
  - src/parameter-decorators.ts
  - src/body.ts
  - src/controller.ts
  - src/guards.ts
  - src/http-result.ts
docs:
  - docs/4.parameters.md
journeys:
  - parameter-sources
  - injected-values
---

# Parameter sources

A module author injects request data into handler arguments and class properties: route, query and header values with `@Parameter` and `@MultiParameter`, and the context, result, connection and streams with `@Context`, `@Result`, `@Connection`, `@WriteStream` and `@BodyStream`.

## Sub-features

- `parameter-sources`: a missing value is undefined (`[]` for `@MultiParameter`), `?page` and `?page=` give `true`, a repeated query parameter gives its first value, header names are case-insensitive, and the same decorators fill class properties.
- `injected-values`: `@Context` is the request context, `@Result` its response, `@Connection` on a `@WebsocketHandler` its connection, `@Connection` on a `@Get` handler throws a `TypeError`, `@WriteStream` puts the response in stream mode with the given content type, `@BodyStream` yields the body chunks.

## How to get to it (user POV)

- `@Parameter("id")`, `@Parameter("page", "query")`, `@MultiParameter("tag")`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" parameter-sources
```

## Gotchas

- The journeys read each provider through `computeParameter`, as the implementation does, with fake requests.
- `@Result` and `@WriteStream` refuse class properties only in the types; see `types`.
