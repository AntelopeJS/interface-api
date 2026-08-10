import assert from "node:assert";
import {
  getRegisteredRoutes,
  RegisterRoute,
  type RouteHandler,
  routesProxy,
  UnregisterRoute,
} from "../index";

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

function routesAt(location: string): number {
  return getRegisteredRoutes().filter((route) => route.location === location)
    .length;
}

describe("Route lifecycle", () => {
  // These run against the local build, whose proxy no module attaches in the
  // test harness (the api module binds the harness-distributed copy). A
  // recording provider both keeps the stub-mode proxy from throwing and lets
  // the cases assert what reaches the real registry.
  const proxyCalls: Array<{ kind: "register" | "unregister"; id: string }> = [];

  before(() => {
    routesProxy.onRegister((id: string) => {
      proxyCalls.push({ kind: "register", id });
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
