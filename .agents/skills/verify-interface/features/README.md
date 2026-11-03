# Feature map

One file per feature. `covers:` lists the source globs it owns, `docs:` the pages a verdict judges, `journeys:` the journeys it runs, and `seeded-breaks/<feature>.patch` the break its journeys must catch. `pnpm exec antelopejs-verify map` checks that every user-facing file is covered.

| Feature | What the user does | Journeys |
|---|---|---|
| [controllers](controllers.md) | A module author groups routes under a base path, nests controllers and splits one across files. | controller-hierarchy |
| [routes](routes.md) | A module author maps methods to endpoints and adds prefix, postfix, monitor and WebSocket hooks. | route-locations, route-errors |
| [registry](registry.md) | A module registers, removes and lists routes at run time. | registry-lifecycle |
| [parameter-sources](parameter-sources.md) | A handler argument or property receives route, query, header, context, stream or connection data. | parameter-sources, injected-values |
| [provider-chain](provider-chain.md) | A reusable decorator feeds a provider's value through ordered modifiers. | provider-chain |
| [body](body.md) | A handler reads the request body buffered, as JSON or as a stream, under a size limit. | body-decoders, body-limit |
| [http-result](http-result.md) | A handler sets the status, body, content type, headers and stream of a response. | result-basics, result-headers, result-send |
| [proxies](proxies.md) | A module calls `Listen`, `GetControllerInstance`, `GetCorsConfig` and `SetCorsConfig` through core. | core-calls, cors-calls |
| [exports](exports.md) | A module imports the contract from the package root. | export-surface |
| [types](types.md) | A TypeScript author compiles against the packed declarations. | declared-shapes |
| [smoke](smoke.md) | The fixed journeys every verdict runs. | core-calls, export-surface |

## Not driven

The interface holds the contract and the decorators; `@antelopejs/api` serves requests. A journey here drives the packed interface next to a stub provider or with fake requests, so these documented behaviours are not driven, each with its reason.

| Documented behaviour | Page | Why it is not driven |
|---|---|---|
| `GET /health` answers `{ "healthy": true }` once an implementation listens | `docs/1.introduction.md`, `README.md` | The server is the implementing module. `pnpm test` runs the repository's own suites against `@antelopejs/api`. |
| Prefix, postfix and monitor handlers run in order and a truthy return short-circuits | `docs/2.controllers.md` | The implementation runs handlers. The journeys drive the mode, method, location and priority each decorator registers. |
| Handler priority orders execution | `docs/2.controllers.md` | Same reason. The five priority values are driven. |
| `GetControllerInstance` returns the per-request instance with its computed properties set | `docs/2.controllers.md` | The implementation builds the instance. The call reaching a provider is driven with JSON stand-ins. |
| `Listen()` starts every configured server | `docs/2.controllers.md` | The implementation owns the servers. The call reaching a provider is driven. |
| `RegisterRoute` sets `module` to the calling module, and a module unload removes its routes | `docs/2.controllers.md` | Needs a module context that a plain `require` of the packed interface does not have. Only the case with no responsible module is driven. |
| An implementation wraps a plain return value in an `HTTPResult` of status 200 | `docs/3.http-handling.md` | Done by the implementation. |
| `ctx.error` holds the error thrown during processing | `docs/3.http-handling.md` | Set by the implementation. |
| CORS headers on a response, preflight caching, reflected request headers | `docs/3.http-handling.md` | The implementation applies the config. The journeys drive the whole `CorsConfig` reaching the provider. |
| An implementation sets class properties before each handler call, and `@Connection` carries a real WebSocket | `docs/4.parameters.md` | Done by the implementation. The computed property providers are driven. |
| `@Connection` is only valid on a `@WebsocketHandler` handler | `docs/4.parameters.md` | Not enforced at run time. |
| Standard JavaScript decorators are unsupported | `docs/1.introduction.md` | A statement about the TypeScript compiler. The probes compile with `experimentalDecorators`. |
| The 500 log line of `HTTPResult.sendResponse` | none | Not documented, and only observable in the log. |
