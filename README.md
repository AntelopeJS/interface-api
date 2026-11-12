<a href="https://github.com/AntelopeJS/antelopejs"><img data-illustration src="./.github/readme/strip.svg" width="100%" alt="INTERFACE · API: part of AntelopeJS, hexagonal architecture beyond your own code. A glowing button reads Star AntelopeJS."></a>

<div align="center">

# `@antelopejs/interface-api`

<a href="https://www.npmjs.com/package/@antelopejs/interface-api"><img data-illustration alt="npm" src="https://img.shields.io/npm/v/@antelopejs/interface-api?style=for-the-badge&labelColor=000000&color=000000"></a> <a href="./LICENSE"><img data-illustration alt="License" src="https://img.shields.io/npm/l/@antelopejs/interface-api?style=for-the-badge&labelColor=000000&color=000000"></a> <a href="https://discord.gg/g4pFt6eXqu"><img data-illustration alt="Discord" src="https://img.shields.io/badge/Discord-18181B?logo=discord&style=for-the-badge&color=000000"></a> <a href="https://interfaces.antelopejs.com/docs/api"><img data-illustration alt="Docs" src="https://img.shields.io/badge/Docs-18181B?style=for-the-badge&color=000000"></a> <a href="https://github.com/AntelopeJS/antelopejs"><img data-illustration alt="Star AntelopeJS" src="https://img.shields.io/github/stars/AntelopeJS/antelopejs?label=Star%20AntelopeJS&style=for-the-badge&labelColor=000000&color=000000&logo=github"></a>

**The AntelopeJS contract for HTTP and WebSocket APIs. Declare controllers and routes with decorators and let the implementing module serve them.**

[Documentation](https://interfaces.antelopejs.com/docs/api) · [Implementations](#implementations) · [All interfaces and providers](https://github.com/AntelopeJS/antelopejs#ecosystem)

</div>

## What it offers

- `Controller` and `PartialController` group routes under a base path, with nesting through `extend`.
- `@Get`, `@Post`, `@Put`, `@Delete`, and `@Route` map methods to endpoints. `@Prefix`, `@Postfix`, and `@Monitor` run before or after them.
- `@Parameter`, `@MultiParameter`, `@JSONBody`, `@RawBody`, `@BodyStream`, `@Context`, `@Result`, and `@WriteStream` inject request data into handler arguments. `@Transform` changes a value before the handler receives it.
- `HTTPResult` sets the status, headers, and body of a response. The body is an `HTTPBody`, which is a string or a value that `JSON.stringify` writes as JSON.
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

The decorators register the routes when JavaScript defines the class. `@antelopejs/api` serves `GET /books/:id` and `POST /books`.

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
| `@antelopejs/interface-core` | `>=0.4.0 <1.0.0` | `0.4.0`     |

<!-- antelopejs-docs-compat:end -->

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before you open a pull request. The local checks are:

```bash
pnpm install
pnpm run checks
```

## Part of AntelopeJS

[AntelopeJS](https://github.com/AntelopeJS/antelopejs) is the framework this interface belongs to: modules depend on contracts, the application chooses each provider, and [AntelopeJS DMS](https://github.com/AntelopeJS/dms), the open-source back office, is built on it.

<!-- antelopejs-framework-modules:start -->

| Area         | Contracts                                                                                                                                                                                                                                                                                                                                                                                                                  | Providers                                                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API          | **`interface-api`** · [`interface-api-util`](https://github.com/AntelopeJS/interface-api-util) · [`interface-data-api`](https://github.com/AntelopeJS/interface-data-api)                                                                                                                                                                                                                                                  | [`api`](https://github.com/AntelopeJS/api)                                                                                                                                                                                                          |
| Auth         | [`interface-auth`](https://github.com/AntelopeJS/interface-auth)                                                                                                                                                                                                                                                                                                                                                           | [`auth-jwt`](https://github.com/AntelopeJS/auth-jwt)                                                                                                                                                                                                |
| Database     | [`interface-database`](https://github.com/AntelopeJS/interface-database) · [`interface-database-decorators`](https://github.com/AntelopeJS/interface-database-decorators) · [`interface-database-catalog`](https://github.com/AntelopeJS/interface-database-catalog) · [`interface-mongodb`](https://github.com/AntelopeJS/interface-mongodb) · [`interface-rethinkdb`](https://github.com/AntelopeJS/interface-rethinkdb) | [`postgres`](https://github.com/AntelopeJS/postgres) · [`mongodb`](https://github.com/AntelopeJS/mongodb) · [`rethinkdb`](https://github.com/AntelopeJS/rethinkdb)                                                                                  |
| Redis        | [`interface-redis`](https://github.com/AntelopeJS/interface-redis) · [`interface-redis-scheduler`](https://github.com/AntelopeJS/interface-redis-scheduler)                                                                                                                                                                                                                                                                | [`redis`](https://github.com/AntelopeJS/redis)                                                                                                                                                                                                      |
| Email        | [`interface-email`](https://github.com/AntelopeJS/interface-email)                                                                                                                                                                                                                                                                                                                                                         | [`nodemailer`](https://github.com/AntelopeJS/nodemailer) · [`brevo`](https://github.com/AntelopeJS/brevo)                                                                                                                                           |
| File storage | [`interface-file-storage`](https://github.com/AntelopeJS/interface-file-storage)                                                                                                                                                                                                                                                                                                                                           | [`file-storage-local`](https://github.com/AntelopeJS/file-storage-local) · [`file-storage-s3`](https://github.com/AntelopeJS/file-storage-s3)                                                                                                       |
| Payments     | [`interface-payment`](https://github.com/AntelopeJS/interface-payment) · [`interface-subscriptions`](https://github.com/AntelopeJS/interface-subscriptions) · [`interface-stripe`](https://github.com/AntelopeJS/interface-stripe)                                                                                                                                                                                         | [`stripe`](https://github.com/AntelopeJS/stripe) · [`mollie`](https://github.com/AntelopeJS/mollie) · [`checkout-com`](https://github.com/AntelopeJS/checkout-com) · [`payment-subscriptions`](https://github.com/AntelopeJS/payment-subscriptions) |

<!-- antelopejs-framework-modules:end -->

## License

[Apache-2.0](./LICENSE)
