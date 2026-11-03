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
import { Controller, Get, HTTPResult, Parameter, RegisterRoute, Result, Transform } from "${"$"}{DIST}";
import type { ComputedParameter, ControllerClass, HTTPBody, ParameterModifier, ParameterProvider, RequestContext, RouteHandler, RouteHandlerMode } from "${"$"}{DIST}";
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
class Fine extends Controller("/fine") {
  @Get("") one(@Parameter("id") @Transform((_context, value) => value) id: string) { return id; }
}
`;

/** One line each; the journey checks that the compiler reports exactly these lines. */
const REFUSED_USES = [
  "interface Named { id: string } declare const viaInterface: Named; const rejected: HTTPBody = viaInterface;",
  "const root = Controller('/x'); declare const instance: InstanceType<typeof root>; instance['anything'];",
  "RegisterRoute({ mode: 'handler', method: 'get', location: '/x', callback: () => 1, parameters: [], properties: {} });",
  "class OnProperty { @Result() response!: HTTPResult; }",
  "const badMode: RouteHandlerMode = 'trace';",
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
      const accepted = await context.command("compile the accepted-use probe", "node", [...common, good]);
      const bad = `${context.work}/bad.ts`;
      context.edit("write the refusal probe", bad, `${header}\n${REFUSED_USES.join("\n")}\n`);
      const refused = await context.command("compile the refusal probe", "node", [...common, bad]);
      const headerLines = header.split("\n").length;
      const lines = refused.stdout.split("\n").flatMap((line) => {
        const match = /^bad\.ts\((\d+),\d+\): error TS\d+/.exec(line.replace(`${context.work}/`, ""));
        return match ? [Number(match[1]) - headerLines] : [];
      });
      context.expect(accepted.folder, [{ name: "every documented use compiles", pass: accepted.exitCode === 0, detail: accepted.stdout.slice(0, 600) }]);
      context.expect(refused.folder, [
        equal("the compiler refuses exactly the shapes the docs say it refuses", lines, REFUSED_USES.map((_line, index) => index + 1)),
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
      containments: [],
      why: "the controllers, decorators, HTTPResult and the four proxies are what every module that serves HTTP imports, and the order of the exports is the published key order",
    },
    outbound: null,
    exposure: {
      globs: ["src/proxies.ts", "src/body.ts"],
      funnels: [],
      containments: [],
      why: "CorsConfig decides which origins a browser may read from, and the request body limit decides how much a client can make the server buffer",
    },
    publish: {
      globs: ["package.json", ".release-it.json", "changelogen.config.json", ".github/workflows/release.yml"],
      funnels: [],
      containments: [],
      why: "the package name and release workflow claim @antelopejs/interface-api on npm",
    },
  },
  journeys: {
    "core-calls": throughCore("Listen, GetCorsConfig, SetCorsConfig and GetControllerInstance reach the provider", Object.values(WRAPPERS)),
    "cors-calls": throughCore("GetCorsConfig and SetCorsConfig reach the provider with the CORS config", [WRAPPERS.GetCorsConfig, WRAPPERS.SetCorsConfig]),
    "export-surface": scenario("the package root exports the documented names in the published order", "exports"),
    "declared-shapes": declared("the packed declarations accept the documented shapes and refuse the documented misuse"),
    "controller-hierarchy": scenario("controllers nest, extend a base and split across files as docs/2.controllers.md states", "controllers"),
    "route-locations": scenario("route decorators register the documented method, mode, location and priority", "route-locations"),
    "route-errors": scenario("route decorators refuse a class or a member the docs say they refuse", "route-errors"),
    "registry-lifecycle": scenario("RegisterRoute, UnregisterRoute and the introspection functions follow the documented lifecycle", "registry"),
    "parameter-sources": scenario("@Parameter and @MultiParameter read the route, query and header values as docs/4.parameters.md states", "sources"),
    "injected-values": scenario("@Context, @Result, @Connection, @WriteStream and @BodyStream inject what the docs state", "injected"),
    "provider-chain": scenario("a provider feeds its modifiers in registration order and a throw stops the chain", "chain"),
    "body-decoders": scenario("@JSONBody and @RawBody decode and limit the body as the docs state", "json-body"),
    "body-limit": scenario("ReadBody and StreamBody enforce the documented limit and streaming rules", "body-limit"),
    "result-basics": scenario("HTTPResult sets the status, body and content type as the docs state", "result-basics"),
    "result-headers": scenario("HTTPResult headers and withHeaders behave as the docs state", "result-headers"),
    "result-send": scenario("HTTPResult streams and sends responses as the docs state", "result-send"),
  },
};

export default config;
