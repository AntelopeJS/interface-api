# Upgrade notes

Each section is the upgrade-notes block of one release. Paste it into the GitHub release body and under the release's heading in `CHANGELOG.md`. The changelog generator writes only commit subjects.

## v0.3.0

### Requirements

- **`@antelopejs/interface-core` peer `>=0.4.0 <1.0.0`** (was `>=0.2.4 <1.0.0`). The published declarations import `DecoratorTarget`, which only interface-core 0.4.0 exports. Against 0.3.0, a consumer with `skipLibCheck: false` fails `tsc` with TS2305 ([#67](https://github.com/AntelopeJS/interface-api/pull/67)).

### Route handlers register by `controller`

- `RouteHandler.proto`, `LegacyRouteHandler` and `LegacyController` are removed. `RegisterRoute` requires `controller`, and `getBody()` returns `string`.
- interface-api 0.3.0 and `@antelopejs/api` 2.0.0 refuse a handler without `controller` with a `TypeError` that names the route. No fallback reads `proto`.
- Route decorators such as `@Get` and `Controller(...)` in existing modules keep working (inferred from how the core resolves one interface-api copy per project, not run end to end). A project that upgrades api should reinstall its modules.

### `ControllerClass` defaults to `object`

- `ControllerClass<T = Record<string, any>>` becomes `ControllerClass<T = object>`. A bare `ControllerClass` instance no longer has a string index, so a consumer that indexes one stops compiling ([#68](https://github.com/AntelopeJS/interface-api/pull/68)).

### Typed controllers, decorator targets and bodies

- **Controller classes and route descriptors are typed.** `Controller(location)` returns `ControllerClass<object>`, and `Controller(location, base)` returns `ControllerClass<T>`, so a `Controller<Foo>("x")` call without a base stops compiling. `GetControllerInstance` takes a `ControllerClass<T>` instead of any class. `ProcessCallback` takes a typed descriptor, and a route decorator on an accessor throws `TypeError: Route decorators apply to methods; <key> has no value` when the class is defined ([#52](https://github.com/AntelopeJS/interface-api/pull/52)).
- **`GetControllerInstance<T>` is bound to `T extends object`** ([#54](https://github.com/AntelopeJS/interface-api/pull/54)).
- **`HTTPResult` bodies are `HTTPBody`, a JSON value.** `HTTPBody` is exported. The `HTTPResult` constructor takes `body?: HTTPBody` (was `unknown`), `setBody` takes `HTTPBody | undefined` (was `any`), and `withHeaders` takes `HTTPResult | HTTPBody | undefined` (was `any`). A body the type cannot show to be JSON, such as an `interface`-typed value, `unknown` or a class instance like zod's `ZodError`, is now a compile error at the call site. Runtime unchanged ([#65](https://github.com/AntelopeJS/interface-api/pull/65)).
- **Decorator targets are interface-core's `DecoratorTarget`.** `SetParameterProvider`, `AddParameterModifier` and `ProcessCallback` take a `DecoratorTarget`. `ControllerMeta`'s constructor takes any `DecoratorTarget`, and `ControllerMeta.location` is `string | undefined`, so a reader that holds only a meta must handle `undefined`. A route decorator on a class that `Controller` did not create throws `TypeError: Route decorators apply to Controller classes; <name> has no location` at decoration, where it used to register a route under `undefined/<key>` ([#67](https://github.com/AntelopeJS/interface-api/pull/67)).

### Published packages that break under the new api

Each builds a route handler with `proto` and no `controller`, so api 2.0.0 refuses it at registration. dms 0.16.0 and dms-automation 0.9.0 are the proposed release targets, not yet set in their manifests.

| Published package                                                                    | Site                                            | Fixed by                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------- |
| `@antelopejs/interface-data-api` 0.5.0                                               | `dist/index.js:70`                              | interface-data-api 0.6.0            |
| `@antelopejs/interface-dms` 0.10.1 to 0.10.3, and `@antelopejs/dms` 0.12.1 to 0.15.0 | `dist/page/internal/metadata-layout.js:35`      | interface-dms 0.12.0 and dms 0.16.0 |
| `@antelopejs/dms-automation` 0.7.0 and 0.8.0                                         | `dist/runtime/builtins/triggers/webhook.js:152` | dms-automation 0.9.0                |
| `@antelopejs-private/datatable` 0.0.9                                                | `dist/interface/index.js:348`                   | nothing                             |
