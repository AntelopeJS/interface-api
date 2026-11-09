import { equal, interrupted } from "@antelopejs/tooling-configs/verify";
import type { CallRequest, Journey, VerifyConfig } from "@antelopejs/tooling-configs/verify";

import { PRELUDE, SCENARIOS } from "./scenarios.ts";

/** A consumer call of one exported interface function, and the arguments the stub provider must receive. */
interface Wrapper {
  name: string;
  args: NonNullable<CallRequest["args"]>;
}

/** JSON stand-ins: the driver sends JSON, so a class and a request context cross core as plain objects. */
const WRAPPERS = {
  Listen: { name: "Listen", args: [] },
  GetCorsConfig: { name: "GetCorsConfig", args: [] },
  SetCorsConfig: {
    name: "SetCorsConfig",
    args: [{ allowedOrigins: ["https://app.example.com"], allowedMethods: ["GET", "POST"], allowedHeaders: ["Content-Type"], credentials: true, maxAge: 600 }],
  },
  GetControllerInstance: { name: "GetControllerInstance", args: ["controller-class", { url: "http://127.0.0.1/users" }] },
} satisfies { [name: string]: Wrapper };

/** Loads the packed interface next to a stub provider and calls each exported function through core: it must reach the provider with every argument. */
function throughCore(title: string, wrappers: Wrapper[]): Journey {
  return {
    title,
    entryPoint: "a consumer module calling the packed interface in `ajs project dev`",
    async run(context) {
      const app = await context.dev("ajs project dev", context.fixture());
      for (const { name, args } of wrappers) {
        const result = await context.call(`call ${name}`, app, { path: [name], args });
        context.expect(result.folder, [
          { name: `${name} resolved through core`, pass: result.ok, detail: JSON.stringify(result.value) },
          equal(`${name} reached the provider with its arguments`, result.value, { stub: `.:${name}`, args }),
        ]);
      }
      const stopped = await context.stop("SIGINT", app);
      context.expect(stopped.folder, [interrupted(stopped)]);
    },
  };
}

/** Runs a scenario script against the packed `dist/index.js` and checks the JSON line it prints against what `docs/` states. */
function scenario(title: string, id: keyof typeof SCENARIOS): Journey {
  const { body, printed } = SCENARIOS[id];
  return {
    title,
    entryPoint: "the packed interface required from a consumer, with fake requests and responses",
    async run(context) {
      const script = [
        PRELUDE,
        "(async () => { const R = {};",
        body,
        'console.log(JSON.stringify(R, (key, value) => (value === undefined ? "<undefined>" : value)));',
        "})().catch((error) => { console.error(error); process.exit(1); });",
      ].join("\n");
      const file = `${context.work}/${id}.js`;
      context.edit(`write the ${id} scenario`, file, script);
      const ran = await context.command(`run the ${id} scenario`, "node", [file, `${context.repo}/dist/index.js`], { timeoutMs: 60_000 });
      context.expect(ran.folder, [
        { name: "the scenario ended cleanly", pass: ran.exitCode === 0, detail: ran.stderr.slice(-300) },
        equal(`${id} answers as docs/ states`, ran.stdout.trim().split("\n").at(-1) ?? "", printed),
      ]);
    },
  };
}

const PROBE_HEADER = `
import type { IncomingMessage, ServerResponse } from "node:http";
import type { PassThrough } from "node:stream";
import { Controller, Get, GetCorsConfig, HTTPResult, Listen, Parameter, RegisterRoute, Result, SetCorsConfig, Transform, WriteStream } from "${"$"}{DIST}";
import type { AllowedOrigin, ComputedParameter, ControllerClass, CorsConfig, HTTPBody, ParameterModifier, ParameterProvider, RequestContext, RouteHandler, RouteHandlerMode } from "${"$"}{DIST}";
type Identical<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
`;

const ACCEPTED_USES = `
const body: HTTPBody = { a: [1, null, "s", true], b: undefined, c: new Date(0) };
type Alias = { id: string };
declare const aliased: Alias;
const fromAlias: HTTPBody = aliased;
interface Named { id: string }
declare const named: Named;
const spread: HTTPBody = { ...named };
type DefaultsToObject = Assert<Identical<ControllerClass, ControllerClass<object>>>;
type ProviderDefault = Assert<Identical<ParameterProvider, (context: RequestContext) => unknown>>;
type ModifierDefault = Assert<Identical<ParameterModifier, (context: RequestContext, previous: unknown) => unknown>>;
type Modes = Assert<Identical<RouteHandlerMode, "prefix" | "postfix" | "handler" | "monitor" | "websocket">>;
type Provider = Assert<Identical<ComputedParameter["provider"], ParameterProvider | undefined>>;
type Priority = Assert<Identical<RouteHandler["priority"], import("${"$"}{DIST}").HandlerPriority | undefined>>;
type Connection = Assert<Identical<RequestContext["connection"], unknown>>;
type ErrorType = Assert<Identical<RequestContext["error"], unknown>>;
type Body = Assert<Identical<RequestContext["body"], Promise<Buffer> | undefined>>;
const status: number = new HTTPResult(200, body).getStatus();
type RawRequest = Assert<Identical<RequestContext["rawRequest"], IncomingMessage>>;
type RawResponse = Assert<Identical<RequestContext["rawResponse"], ServerResponse>>;
type ContextUrl = Assert<Identical<RequestContext["url"], URL>>;
type RouteParameters = Assert<Identical<RequestContext["routeParameters"], Record<string, string>>>;
type ContextResponse = Assert<Identical<RequestContext["response"], HTTPResult>>;
type Peek = Assert<Identical<ReturnType<HTTPResult["peekHeaders"]>, Readonly<Record<string, string>> | undefined>>;
type CorsKeys = Assert<Identical<keyof CorsConfig, "allowedOrigins" | "allowedMethods" | "allowedHeaders" | "credentials" | "maxAge">>;
type Origin = Assert<Identical<AllowedOrigin, string | RegExp | Array<string | RegExp>>>;
type GetCors = Assert<Identical<typeof GetCorsConfig, () => Promise<CorsConfig>>>;
type SetCors = Assert<Identical<typeof SetCorsConfig, (config: CorsConfig) => Promise<void>>>;
type Listening = Assert<Identical<typeof Listen, () => Promise<void>>>;
const emptyCors: CorsConfig = {};
class Fine extends Controller("/fine") {
  @Get("") one(@Parameter("id") @Transform((_context, value) => value) id: string) { return id; }
}
const forwarded = (source: "param" | "query" | "header") => Parameter("x", source);
const forwardedOptional = (name: string, source?: "param" | "query" | "header") => Parameter(name, source);
const routeOnly: Parameters<typeof Parameter> = ["id"];
const namedQuery: import("${"$"}{DIST}").QueryDecorator = Parameter("q", "query");
type QueryValueShape = Assert<Identical<import("${"$"}{DIST}").QueryValue, string | true | undefined>>;
class QueryUses extends Controller("/query") {
  @Parameter("q", "query") declare full: string | true | undefined;
  @Parameter("q", "query") declare wide: unknown;
  @Parameter("q", "query") optional?: string | true;
  @Parameter("h", "header") header?: string;
  @Get("") one(@Parameter("q", "query") q: string | true | undefined, @Parameter("h", "header") h?: string) { return [q, h]; }
}
`;

/** One line each; the journey checks that the compiler reports exactly these lines. */
const REFUSED_USES = [
  "interface Named { id: string } declare const viaInterface: Named; const rejected: HTTPBody = viaInterface;",
  "const root = Controller('/x'); declare const instance: InstanceType<typeof root>; instance['anything'];",
  "RegisterRoute({ mode: 'handler', method: 'get', location: '/x', callback: () => 1, parameters: [], properties: {} });",
  "class OnProperty { @Result() response!: HTTPResult; }",
  "const badMode: RouteHandlerMode = 'trace';",
  "class OnWriteStream { @WriteStream() stream!: PassThrough; }",
  "const badOrigin: AllowedOrigin = 42;",
  "const badStatus = new HTTPResult('200');",
  "class QueryProperty { @Parameter('q', 'query') declare q: string; }",
  "class QueryArgument { one(@Parameter('q', 'query') q?: string) { return q; } }",
];

/** Compiles probes against the packed declarations in a consumer's strict mode. */
function declared(title: string): Journey {
  return {
    title,
    entryPoint: "a TypeScript consumer compiling against the packed declarations",
    async run(context) {
      const dist = `${context.repo}/dist/index`;
      const header = PROBE_HEADER.replace(/\$\{DIST\}/g, dist);
      const common = [
        `${context.repo}/node_modules/typescript/bin/tsc`,
        "--noEmit",
        "--strict",
        "--skipLibCheck",
        "--experimentalDecorators",
        "--target",
        "es2022",
        "--module",
        "commonjs",
        "--moduleResolution",
        "node",
        "--typeRoots",
        `${context.repo}/node_modules/@types`,
        "--types",
        "node",
      ];
      await context.command("link the repository's dependencies", "ln", ["-s", `${context.repo}/node_modules`, `${context.work}/node_modules`]);
      const good = `${context.work}/good.ts`;
      context.edit("write the accepted-use probe", good, `${header}${ACCEPTED_USES.replace(/\$\{DIST\}/g, dist)}`);
      const bad = `${context.work}/bad.ts`;
      context.edit("write the refusal probe", bad, `${header}\n${REFUSED_USES.join("\n")}\n`);
      const compiled = await context.command("compile both probes", "node", [...common, good, bad]);
      const headerLines = header.split("\n").length;
      const errors = compiled.stdout
        .split("\n")
        .map((line) => line.replace(`${context.work}/`, ""))
        .filter((line) => /\berror TS\d+/.test(line));
      const lines = errors.flatMap((line) => {
        const match = /^bad\.ts\((\d+),\d+\): error TS\d+/.exec(line);
        return match ? [Number(match[1]) - headerLines] : [];
      });
      const outsideRefusals = errors.filter((line) => !line.startsWith("bad.ts("));
      context.expect(compiled.folder, [
        { name: "every documented use compiles", pass: outsideRefusals.length === 0 && compiled.exitCode !== null && compiled.exitCode <= 2, detail: outsideRefusals.join("\n").slice(0, 600) || compiled.stderr.slice(-300) },
        equal("the compiler refuses exactly the shapes the docs say it refuses", lines, REFUSED_USES.map((_line, index) => index + 1)),
      ]);
    },
  };
}


const DECORATED_CONTROLLER = `
import { Controller, Get, Monitor, Parameter, Prefix, Transform } from "\${DIST}";

export const order: string[] = [];

export class Items extends Controller("/items") {
  @Parameter("token", "header")
  private token?: string;

  @Get(":id")
  one(
    @Parameter("id")
    @Transform((_context, value) => {
      order.push("outer");
      return String(value) + "-outer";
    })
    @Transform((_context, value) => {
      order.push("inner");
      return String(value) + "-inner";
    })
    id: string,
  ) {
    return id;
  }

  @Prefix("get", ":id")
  guard() {}

  @Monitor("get", ":id")
  watch() {}
}
`;

const DECORATED_RUN = [
  "require(process.argv[3]);",
  "const probe = require(process.argv[3]);",
  "const route = routeOf('one');",
  "R.routes = a.getRegisteredRouteHandlers().map((r) => [r.handler.mode, r.handler.location, r.handler.callback.name]);",
  "R.parameters = [route.parameters.length, await a.computeParameter(ctx(), route.parameters[0], new C())];",
  "R.order = probe.order;",
  "R.properties = [Object.keys(route.properties), await a.computeParameter(ctx({ rawRequest: mk([], { token: 'secret' }) }), route.properties.token, new C())];",
].join("\n");

/** Compiles a controller written with real legacy decorators and runs it against the packed interface. */
function decorated(title: string): Journey {
  return {
    title,
    entryPoint: "a TypeScript module compiled with experimentalDecorators, as docs/1.introduction.md requires",
    async run(context) {
      const dist = `${context.repo}/dist/index`;
      await context.command("link the repository's dependencies", "ln", ["-s", `${context.repo}/node_modules`, `${context.work}/node_modules`]);
      const source = `${context.work}/items.ts`;
      context.edit("write the decorated controller", source, DECORATED_CONTROLLER.replace(/\$\{DIST\}/g, dist));
      const compiled = await context.command("compile the decorated controller", "node", [
        `${context.repo}/node_modules/typescript/bin/tsc`,
        "--strict",
        "--skipLibCheck",
        "--experimentalDecorators",
        "--target",
        "es2022",
        "--module",
        "commonjs",
        "--moduleResolution",
        "node",
        "--outDir",
        `${context.work}/out`,
        "--typeRoots",
        `${context.repo}/node_modules/@types`,
        "--types",
        "node",
        source,
      ]);
      const script = [PRELUDE, "(async () => { const R = {};", DECORATED_RUN, 'console.log(JSON.stringify(R, (key, value) => (value === undefined ? "<undefined>" : value)));', "})().catch((error) => { console.error(error); process.exit(1); });"].join("\n");
      const runner = `${context.work}/run-items.js`;
      context.edit("write the runner", runner, script);
      const ran = await context.command("run the compiled controller", "node", [runner, dist + ".js", `${context.work}/out/items.js`], { timeoutMs: 60_000 });
      context.expect(compiled.folder, [{ name: "the decorated controller compiles", pass: compiled.exitCode === 0, detail: compiled.stdout.slice(0, 400) }]);
      context.expect(ran.folder, [
        { name: "the runner ended cleanly", pass: ran.exitCode === 0, detail: ran.stderr.slice(-300) },
        equal("stacked decorators register as docs/4.parameters.md states", ran.stdout.trim().split("\n").at(-1) ?? "", "{\"routes\":[[\"handler\",\"/items/:id\",\"one\"],[\"prefix\",\"/items/:id\",\"guard\"],[\"monitor\",\"/items/:id\",\"watch\"]],\"parameters\":[1,\"42-inner-outer\"],\"order\":[\"inner\",\"outer\"],\"properties\":[[\"token\"],\"secret\"]}"),
      ]);
    },
  };
}

const config: VerifyConfig = {
  doors: {
    data: null,
    format: null,
    contract: {
      globs: ["src/index.ts", "package.json"],
      funnels: [],
      why: "the controllers, decorators, HTTPResult and the four proxies are what every module that serves HTTP imports, and the order of the exports is the published key order",
    },
    outbound: null,
    exposure: {
      globs: ["src/proxies.ts", "src/body.ts"],
      funnels: [],
      why: "CorsConfig decides which origins a browser may read from, and the request body limit decides how much a client can make the server buffer",
    },
    publish: {
      globs: ["package.json", ".release-it.json", "changelogen.config.json", ".github/workflows/release.yml"],
      funnels: [],
      why: "the package name and release workflow claim @antelopejs/interface-api on npm",
    },
  },
  journeys: {
    "core-calls": throughCore("Listen, GetCorsConfig, SetCorsConfig and GetControllerInstance reach the provider", Object.values(WRAPPERS)),
    "cors-calls": throughCore("GetCorsConfig and SetCorsConfig reach the provider with the CORS config", [WRAPPERS.GetCorsConfig, WRAPPERS.SetCorsConfig]),
    "export-surface": scenario("the package root exports the documented names in the published order", "exports"),
    "declared-shapes": declared("the packed declarations accept the documented uses and refuse the documented misuse"),
    "controller-hierarchy": scenario("controllers nest, extend a base and split across files as docs/2.controllers.md states", "controllers"),
    "route-locations": scenario("route decorators register the documented method, mode, location and priority", "route-locations"),
    "route-errors": scenario("route decorators refuse a class or a member the docs say they refuse", "route-errors"),
    "registry-lifecycle": scenario("RegisterRoute, UnregisterRoute and the introspection functions follow the documented lifecycle", "registry"),
    "parameter-sources": scenario("@Parameter and @MultiParameter read the route, query and header values as docs/4.parameters.md states", "sources"),
    "injected-values": scenario("@Context, @Result, @Connection, @WriteStream and @BodyStream inject what the docs state", "injected"),
    "stacked-decorators": decorated("legacy decorators stacked on one parameter register a provider and modifiers bottom to top"),
    "provider-chain": scenario("a provider feeds its modifiers in registration order and a throw stops the chain", "chain"),
    "body-decoders": scenario("@JSONBody and @RawBody decode and limit the body as the docs state", "json-body"),
    "body-limit": scenario("ReadBody and StreamBody enforce the documented limit and streaming rules", "body-limit"),
    "result-basics": scenario("HTTPResult sets the status, body and content type as the docs state", "result-basics"),
    "result-headers": scenario("HTTPResult headers and withHeaders behave as the docs state", "result-headers"),
    "result-send": scenario("HTTPResult streams and sends responses as the docs state", "result-send"),
  },
};

export default config;
