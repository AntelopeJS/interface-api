# @antelopejs/interface-api

<div align="center">
<a href="https://www.npmjs.com/package/@antelopejs/interface-api"><img alt="npm" src="https://img.shields.io/npm/v/@antelopejs/interface-api?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="./LICENSE"><img alt="License" src="https://img.shields.io/npm/l/@antelopejs/interface-api?style=for-the-badge&labelColor=000000&color=000000"></a>
<a href="https://discord.gg/sjK28QHrA7"><img alt="Discord" src="https://img.shields.io/badge/Discord-18181B?logo=discord&style=for-the-badge&color=000000"></a>
<a href="https://interfaces.antelopejs.com/docs/api"><img alt="Docs" src="https://img.shields.io/badge/Docs-18181B?style=for-the-badge&color=000000"></a>
</div>

The AntelopeJS contract for HTTP and WebSocket APIs: declare controllers and routes with decorators, and let the module that implements the interface serve them.

## What it offers

- `Controller` and `PartialController` group routes under a base path, with nesting through `extend`.
- `@Get`, `@Post`, `@Put`, `@Delete` and `@Route` map methods to endpoints; `@Prefix`, `@Postfix` and `@Monitor` run around them.
- `@Parameter`, `@JSONBody`, `@RawBody`, `@Context` and `@WriteStream` inject request data into handler arguments.
- `HTTPResult` sets the status, headers and body of a response.
- `@WebsocketHandler` and `@Connection` handle WebSocket connections on the same controllers.

## Implementations

| Module                                                 | Notes                                    |
| ------------------------------------------------------ | ---------------------------------------- |
| [`@antelopejs/api`](https://github.com/AntelopeJS/api) | HTTP and WebSocket server, CORS settings |

## Install

Add the interface to the module that declares routes:

```bash
pnpm add @antelopejs/interface-api
```

Then add an implementation to the project:

```bash
ajs project modules add @antelopejs/api
```

## Quick start

```ts
import {
  Controller,
  Get,
  HTTPResult,
  JSONBody,
  Parameter,
  Post,
} from "@antelopejs/interface-api";

export class BookController extends Controller("/books") {
  @Get(":id")
  async getBook(@Parameter("id") id: string) {
    return new HTTPResult(200, { id });
  }

  @Post("")
  async createBook(@JSONBody() body: { title: string }) {
    return new HTTPResult(201, body);
  }
}
```

The decorators register the routes when the class is defined. `@antelopejs/api` serves `GET /books/:id` and `POST /books`.

## Documentation

- [Introduction](./docs/1.introduction.md)
- [Controllers and route registration](./docs/2.controllers.md)
- [HTTP handling and CORS](./docs/3.http-handling.md)
- [Parameters](./docs/4.parameters.md)

## Compatibility

The module declares this peer dependency:

<!-- antelopejs-docs-compat:start -->

| Package                      | Supported        | Tested with |
| ---------------------------- | ---------------- | ----------- |
| `@antelopejs/interface-core` | `>=0.2.4 <1.0.0` | `0.2.4`     |

<!-- antelopejs-docs-compat:end -->

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before you open a pull request. The local checks are:

```bash
pnpm install
pnpm run checks
```

## License

[Apache-2.0](./LICENSE)
