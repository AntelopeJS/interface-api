import assert from "node:assert";
import {
  type ComputedParameter,
  getRegisteredRouteHandlers,
  getRegisteredRoutes,
  HandlerPriority,
  RegisterRoute,
  type RouteHandler,
  routesProxy,
  UnregisterRoute,
} from "../index";

interface ProxyCall {
  handler?: RouteHandler;
  id: string;
  kind: "register" | "unregister";
}

const proxyCalls: ProxyCall[] = [];

function handlerAt(location: string): RouteHandler {
  return {
    location,
    method: "GET",
    mode: "handler",
    parameters: [],
    properties: {},
    proto: {},
    callback: async () => new Response(),
  } as unknown as RouteHandler;
}

function completeHandlerAt(location: string): RouteHandler {
  const parameter: ComputedParameter = {
    provider: () => "parameter",
    modifiers: [],
  };
  return {
    location,
    method: "POST",
    mode: "prefix",
    parameters: [parameter, null],
    properties: { property: parameter },
    proto: { controller: location },
    callback: function completeRouteCallback() {
      return location;
    },
    priority: HandlerPriority.HIGH,
  };
}

function routesAt(location: string): number {
  return getRegisteredRoutes().filter((route) => route.location === location)
    .length;
}

describe("Route lifecycle", () => {
  // These run against the local build, whose proxy no module attaches in the
  // test harness (the api module binds the harness-distributed copy). A
  // recording provider both keeps the stub-mode proxy from throwing and lets
  // the cases assert what reaches the real registry.
  before(() => {
    routesProxy.onRegister((id: string, handler: RouteHandler) => {
      proxyCalls.push({ kind: "register", id, handler });
    }, true);
    routesProxy.onUnregister((id: string) => {
      proxyCalls.push({ kind: "unregister", id });
    });
  });

  beforeEach(() => {
    proxyCalls.length = 0;
  });

  it("releases a route by the id RegisterRoute returned", () => {
    const id = RegisterRoute(handlerAt("/lifecycle/released"));
    const bystander = RegisterRoute(handlerAt("/lifecycle/bystander"));
    assert.equal(routesAt("/lifecycle/released"), 1);

    UnregisterRoute(id);

    // Gone from the public listing, and only the targeted route: the
    // bystander keeps serving.
    assert.equal(routesAt("/lifecycle/released"), 0);
    assert.equal(routesAt("/lifecycle/bystander"), 1);
    // The proxy heard the unregister under the id RegisterRoute handed out,
    // as a string — the registry is keyed that way.
    assert.deepEqual(proxyCalls.at(-1), {
      kind: "unregister",
      id: id.toString(),
    });
    UnregisterRoute(bystander);
    assert.equal(routesAt("/lifecycle/bystander"), 0);
  });

  it("tolerates unregistering the same id twice", () => {
    const id = RegisterRoute(handlerAt("/lifecycle/twice"));
    UnregisterRoute(id);

    assert.doesNotThrow(() => UnregisterRoute(id));
    assert.equal(routesAt("/lifecycle/twice"), 0);
  });

  it("ignores an id that was never registered", () => {
    const before = getRegisteredRoutes().length;

    assert.doesNotThrow(() => UnregisterRoute(999_999));

    assert.equal(getRegisteredRoutes().length, before);
  });
});

describe("getRegisteredRouteHandlers", () => {
  const routeIds: number[] = [];

  function register(handler: RouteHandler): number {
    const id = RegisterRoute(handler);
    routeIds.push(id);
    return id;
  }

  afterEach(() => {
    for (const id of routeIds.splice(0)) {
      UnregisterRoute(id);
    }
  });

  it("returns complete registered handlers without replacing the provider", () => {
    const original = completeHandlerAt("/handlers/complete");
    const id = register(original);

    const registered = getRegisteredRouteHandlers().find(
      (registered) => registered.id === id.toString(),
    );
    assert(registered);
    assert.equal(registered.handler.mode, original.mode);
    assert.strictEqual(registered.handler.callback, original.callback);
    assert.strictEqual(registered.handler.proto, original.proto);
    assert.strictEqual(registered.handler.parameters, original.parameters);
    assert.strictEqual(registered.handler.properties, original.properties);
    assert.equal(registered.handler.priority, original.priority);
    assert(Object.hasOwn(registered.handler, "module"));
    assert.equal(typeof registered.handler.module, "string");
    const providerCall = proxyCalls.at(-1);
    assert.equal(providerCall?.kind, "register");
    assert.equal(providerCall?.id, id.toString());
    assert.strictEqual(providerCall?.handler, registered.handler);
    assert.equal(Object.hasOwn(original, "module"), false);
  });

  it("excludes explicitly unregistered routes", () => {
    const id = register(handlerAt("/handlers/unregister"));

    UnregisterRoute(id);

    assert.equal(
      getRegisteredRouteHandlers().some(
        (registered) => registered.id === id.toString(),
      ),
      false,
    );
  });

  it("excludes routes removed during module unload", () => {
    const id = register(handlerAt("/handlers/module-unload"));
    const registered = getRegisteredRouteHandlers().find(
      (entry) => entry.id === id.toString(),
    );
    assert(registered);
    const module = registered.handler.module;
    assert(module);

    routesProxy.unregisterModule(module);

    assert.equal(
      getRegisteredRouteHandlers().some((entry) => entry.id === id.toString()),
      false,
    );
    assert.equal(routesAt("/handlers/module-unload"), 0);
  });
});
