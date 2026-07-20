---
name: api-interface
description: Provides decorator-based HTTP controllers and WebSocket routing for AntelopeJS modules - Controller, Get/Post/Put/Delete/Route, Prefix/Postfix/Monitor handlers, parameter injection (Parameter, JSONBody, RawBody, Context, WriteStream, Connection), HTTPResult responses, and CORS configuration. Use when code imports "@antelopejs/interface-api", or when asked to add an HTTP endpoint, REST route, API controller, WebSocket handler, streamed/SSE response, request middleware (prefix/postfix), or CORS settings in an AntelopeJS project, or when symbols like HTTPResult, RequestContext, WebsocketHandler, RegisterRoute, or Listen appear.
category: antelopejs-interface
tags: [antelopejs, http, api, websocket, controllers]
---

# API Interface

Decorator-based HTTP framework interface. Route decorators run on the consumer
side: defining a controller class registers its handlers immediately (at class
definition time) into a registering proxy. The actual HTTP server lives in the
implementing module; `Listen`, `GetControllerInstance`, `GetCorsConfig`, and
`SetCorsConfig` are async interface functions that cross the proxy to it, so
they always return Promises and resolve once an implementation is attached.

## Imports

Everything is exported from the package root (no subpaths):

```ts
import {
  Controller, PartialController, Get, Post, Put, Delete, Route,
  Prefix, Postfix, Monitor, WebsocketHandler, HandlerPriority,
  Parameter, MultiParameter, JSONBody, RawBody, Context, Result,
  WriteStream, Connection, Transform, HTTPResult, RequestContext,
  Listen, GetControllerInstance, GetCorsConfig, SetCorsConfig,
} from "@antelopejs/interface-api";
```

## Consuming: define a controller

```ts
import { Controller, Get, Post, Parameter, JSONBody, HTTPResult } from "@antelopejs/interface-api";

export class BookController extends Controller("/books") {
  @Get(":id")
  async getBook(@Parameter("id") id: string) {
    return new HTTPResult(200, { id }); // non-string body -> JSON + application/json
  }

  @Post() // no location -> registers POST /books/createBook (method name becomes the path segment)
  async createBook(@JSONBody() body: { title: string }) {
    return new HTTPResult(201, body);
  }
}
```

Sub-paths: `class Sub extends BookController.extend("archive") {}` mounts at
`/books/archive`. `PartialController(BookController)` reuses the same location
(and inherited computed properties) to split routes across files.

## Gotchas

- All decorators are factories and MUST be called, even with zero args:
  `@JSONBody()`, `@RawBody()`, `@Context()`, `@Result()`, `@Connection()`,
  `@WriteStream()`, `@Get()`. A bare `@JSONBody` compiles but silently injects
  nothing (the parameter is `undefined` at runtime).
- Argument order differs: `@Get/@Post/@Put/@Delete(location?, mode?)` take the
  location first, but `@Prefix/@Postfix/@Monitor(method, location?, priority?)`
  take the HTTP method first; `"*"` as location matches all routes under the
  controller.
- `@Get()` with no location uses the method name as the path segment.
- Prefix handlers run before the main handler (auth/validation); if a prefix
  handler returns a value, that value becomes the response and the main
  handler is skipped. Postfix handlers run after and can modify the response
  via `@Result()`; if a postfix handler returns a value, subsequent postfix
  handlers are skipped. Monitor handlers run after processing regardless of
  success and their return value is ignored.
- `HandlerPriority` orders competing prefix/postfix/monitor handlers; lower
  values run first (`HIGHEST = 0`).
- `@Parameter(name, source)` defaults to `source: "param"` (route params like
  `:id`); use `"query"` or `"header"` explicitly. `@MultiParameter` defaults to
  `"query"` and returns an array.
- Streaming/SSE: inject `@WriteStream(contentType)` (a `PassThrough`) or call
  `response.getWriteStream()`; the response then ignores the body string.
- WebSocket routes use `@WebsocketHandler(location)` with `@Connection()` to
  get the socket; they are matched as GET upgrades.
- Custom injection: build your own decorators with `SetParameterProvider` /
  `AddParameterModifier` (provider -> modifiers chain, each may be async),
  wrapped with `MakeParameterDecorator` from
  `@antelopejs/interface-core/decorators` (not exported by this package), or
  attach per-value transforms with `@Transform(fn)`.
- Providing this interface is the job of an HTTP server module (it implements
  the interface functions and consumes the registered route handlers); normal
  application code only consumes the decorators above.

## Reference

Deeper reference lives in this package's `docs/` (Introduction, Controllers,
HTTP Handling, Parameter Handling) and in `dist/index.d.ts`. Do not guess APIs
beyond those files.
