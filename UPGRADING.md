# Upgrade notes

Each section is the upgrade-notes block of one release. Paste it into the GitHub release body and under the release's heading in `CHANGELOG.md`. The changelog generator writes only commit subjects.

## v0.3.0

### Route handlers register by `controller`

- `RouteHandler.proto`, `LegacyRouteHandler` and `LegacyController` are removed. `RegisterRoute` requires `controller`, and `getBody()` returns `string`.
- interface-api 0.3.0 and `@antelopejs/api` 2.0.0 refuse a handler without `controller` with a `TypeError` that names the route. No fallback reads `proto`.
- Route decorators such as `@Get` and `Controller(...)` in existing modules keep working. A project that upgrades api should reinstall its modules.

### `ControllerClass` defaults to `object`

- `ControllerClass<T = Record<string, any>>` becomes `ControllerClass<T = object>`. A bare `ControllerClass` instance no longer has a string index, so a consumer that indexes one stops compiling ([#68](https://github.com/AntelopeJS/interface-api/pull/68)).

### Published packages that break under the new api

Each builds a route handler with `proto` and no `controller`, so api 2.0.0 refuses it at registration.

| Published package                                                                    | Site                                            | Fixed by                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------- |
| `@antelopejs/interface-data-api` 0.5.0                                               | `dist/index.js:70`                              | interface-data-api 0.6.0            |
| `@antelopejs/interface-dms` 0.10.1 to 0.10.3, and `@antelopejs/dms` 0.12.1 to 0.15.0 | `dist/page/internal/metadata-layout.js:35`      | interface-dms 0.12.0 and dms 0.16.0 |
| `@antelopejs/dms-automation` 0.7.0 and 0.8.0                                         | `dist/runtime/builtins/triggers/webhook.js:152` | dms-automation 0.9.0                |
| `@antelopejs-private/datatable` 0.0.9                                                | `dist/interface/index.js:348`                   | nothing                             |
