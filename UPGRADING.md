# Upgrade notes

Each section is the upgrade-notes block of one release. Paste it into the GitHub release body and under the release's heading in `CHANGELOG.md`. The changelog generator writes only commit subjects.

## Unreleased

### `@Parameter(name, "query")` refuses a type that does not admit `true`

- A query value is `true` for `?name` and `?name=`, `undefined` when absent, and a string otherwise. A property or handler argument decorated with `@Parameter(name, "query")` must now be typed to admit `string | true | undefined`, such as `string | true | undefined`, `string | true` on an optional member, or `unknown`. A member typed `string` fails `tsc` with TS1240 (property) or TS1239 (argument). Runtime unchanged ([#57](https://github.com/AntelopeJS/interface-api/issues/57)).
- A private member is not checked: the compiler gives the decorator no access to its type.

## v0.3.0

### Requirements

- **`@antelopejs/interface-core` peer `>=0.4.0 <1.0.0`** (was `>=0.2.4 <1.0.0`). The published declarations import `DecoratorTarget`, which only interface-core 0.4.0 exports. Against 0.3.0, a consumer with `skipLibCheck: false` fails `tsc` with TS2305 ([#67](https://github.com/AntelopeJS/interface-api/pull/67)).

### Route handlers register by `controller`

- `RouteHandler.proto` is removed. `RegisterRoute` requires `controller`, and `getBody()` returns `string`.
- interface-api 0.3.0 and `@antelopejs/api` 2.0.0 refuse a handler without `controller` with a `TypeError` that names the route. No fallback reads `proto`.
- Route decorators such as `@Get` and `Controller(...)` in existing modules keep working (inferred from how the core resolves one interface-api copy per project, not run end to end). A project that upgrades api should reinstall its modules.

### `ControllerClass` defaults to `object`

- `ControllerClass<T = Record<string, any>>` becomes `ControllerClass<T = object>`. A bare `ControllerClass` instance no longer has a string index, so a consumer that indexes one stops compiling ([#68](https://github.com/AntelopeJS/interface-api/pull/68)).

### Typed controllers, decorator targets and bodies

- **Controller classes and route descriptors are typed.** `Controller(location)` returns `ControllerClass<object>`, and `Controller(location, base)` returns `ControllerClass<T>`, so a `Controller<Foo>("x")` call without a base stops compiling. `GetControllerInstance` takes a `ControllerClass<T>` instead of any class. `computeParameter`, a public export, takes the controller instance instead of `unknown`. `ProcessCallback` takes a typed descriptor, and a route decorator on an accessor throws `TypeError: Route decorators apply to methods; <key> has no value` when the class is defined ([#52](https://github.com/AntelopeJS/interface-api/pull/52)).
- **`GetControllerInstance<T>` is bound to `T extends object`** ([#54](https://github.com/AntelopeJS/interface-api/pull/54)).
- **`HTTPResult` bodies are `HTTPBody`, a JSON value.** `HTTPBody` is exported. The `HTTPResult` constructor takes `body?: HTTPBody` (was `unknown`), `setBody` takes `HTTPBody | undefined` (was `any`), and `withHeaders` takes `HTTPResult | HTTPBody | undefined` (was `any`). A body the type cannot show to be JSON, such as an `interface`-typed value, `unknown` or a class instance like zod's `ZodError`, is now a compile error at the call site. Runtime unchanged ([#65](https://github.com/AntelopeJS/interface-api/pull/65)).
- **Decorator targets are interface-core's `DecoratorTarget`.** `SetParameterProvider`, `AddParameterModifier` and `ProcessCallback` take a `DecoratorTarget`. `ControllerMeta`'s constructor takes any `DecoratorTarget`, and `ControllerMeta.location` is `string | undefined`, so a reader that holds only a meta must handle `undefined`. A route decorator on a class that `Controller` did not create throws `TypeError: Route decorators apply to Controller classes; <name> has no location` at decoration, where it used to register a route under `undefined/<key>` ([#67](https://github.com/AntelopeJS/interface-api/pull/67)).

### Published versions that break under the new api

Each version below builds a route handler with `proto` and no `controller`, so api 2.0.0 refuses it at registration. Measured on 2026-11-03: every published version of the first three packages was packed from npm, and its `dist` was searched for a `proto:` handler with no `controller:` within six lines.

- `@antelopejs/interface-data-api`: every published version, 0.0.2 to 0.5.0 (`dist/index.js:70` or `:71`). Fixed by interface-data-api 0.6.0.
- `@antelopejs/interface-dms`: every published version, 0.0.1 to 0.10.3 (`dist/page/metadata.js` up to 0.9.1, `dist/page/internal/metadata-layout.js:35` from 0.10.0). Fixed by interface-dms 0.12.0.
- `@antelopejs/dms` 0.5.0 to 0.15.0: each caps its `@antelopejs/interface-dms` range below 0.11.0, so it can only resolve one of the versions above. Fixed by dms 0.16.0. dms 0.4.8 and earlier accept any interface-dms below 1.0.0. Whether they run with interface-dms 0.12.0 was not checked.
- `@antelopejs/dms-automation`: every published version, 0.0.1 to 0.8.0 (`dist/runtime/builtins/triggers/webhook.js`). Fixed by dms-automation 0.9.0.
- `@antelopejs-private/datatable` 0.0.9 (`dist/interface/index.js:348`). Nothing fixes it. This row comes from the release plan and was not re-measured, because the package is on the private registry.

dms 0.16.0 and dms-automation 0.9.0 are the proposed release targets, not yet set in their manifests.
