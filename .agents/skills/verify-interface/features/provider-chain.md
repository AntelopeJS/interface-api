---
covers:
  - src/parameter-decorators.ts
  - src/controller.ts
docs:
  - docs/4.parameters.md
journeys:
  - provider-chain
  - stacked-decorators
---

# Provider and modifier chain

A module author builds reusable decorators with `SetParameterProvider`, `AddParameterModifier` and `@Transform`: a provider feeds its modifiers in registration order, each result is awaited, and a throw stops the chain.

## Sub-features

- `provider-chain`: modifiers run in registration order with the previous value, a thrown `HTTPResult` is the outcome and later modifiers do not run, a missing provider yields undefined, the last provider set wins, providers and modifiers run with the controller instance as `this`, and an index gap leaves `null` entries.
- `stacked-decorators`: a controller written with real legacy decorators and compiled with `experimentalDecorators` registers `@Parameter("id") @Transform(a) @Transform(b)` as one provider with the modifiers in bottom-to-top order, plus a property provider, a prefix and a monitor.

## How to get to it (user POV)

- `@Parameter("id") @Transform(parseId) id: number`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" provider-chain
```

## Gotchas

- The decorators are applied in a fixed order by hand; stacked legacy decorators apply bottom to top.
