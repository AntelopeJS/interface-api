import assert from "node:assert";

import {
  type ComputedParameter,
  Controller,
  Get,
  getRegisteredRouteHandlers,
  getRegisteredRoutes,
  HandlerPriority,
  Parameter,
  RegisterRoute,
  type RouteHandler,
  routesProxy,
  UnregisterRoute,
} from "../index";
import { createRequestContext } from "./request-context";

interface ProxyCall {
  handler?: RouteHandler;
  id: string;
  kind: "register" | "unregister";
}

const proxyCalls: ProxyCall[] = [];

class LifecycleController extends Controller("/lifecycle") {}

function handlerAt(location: string): RouteHandler {
  return {
    location,
    method: "GET",
    mode: "handler",
    parameters: [],
    properties: {},
    controller: LifecycleController,
    callback: async () => new Response(),
  };
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
    controller: LifecycleController,
    callback: function completeRouteCallback() {
      return location;
    },
    priority: HandlerPriority.HIGH,
  };
}

function providedValueOf(parameter: ComputedParameter | null | undefined) {
  return parameter?.provider?.(createRequestContext());
}

function stableFieldsOf(handler: RouteHandler | undefined) {
  return {
    location: handler?.location,
    method: handler?.method,
    mode: handler?.mode,
    module: handler?.module,
    priority: handler?.priority,
  };
}

function routesAt(location: string): number {
  return getRegisteredRoutes().filter((route) => route.location === location)
    .length;
}

describe("Route lifecycle", () => {
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

    assert.equal(
      routesAt("/lifecycle/released"),
      0,
      "The released route is gone from the public listing",
    );
    assert.equal(
      routesAt("/lifecycle/bystander"),
      1,
      "Only the targeted route is released: the bystander keeps serving",
    );
    assert.deepEqual(
      proxyCalls.at(-1),
      { kind: "unregister", id: id.toString() },
      "The proxy hears the unregister under the string id RegisterRoute handed out",
    );
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
    const { handler } = registered;
    assert.equal(handler.location, original.location);
    assert.equal(handler.method, original.method);
    assert.equal(handler.mode, original.mode);
    assert.equal(handler.priority, original.priority);
    assert.equal(handler.callback(), original.location);
    assert.strictEqual(handler.controller, original.controller);
    assert.equal(
      Object.hasOwn(handler, "proto"),
      false,
      "The registered copy names its controller only",
    );
    assert.equal(handler.parameters.length, 2);
    assert.equal(handler.parameters[1], null);
    assert.equal(providedValueOf(handler.parameters[0]), "parameter");
    assert.equal(handler.parameters[0]?.modifiers.length, 0);
    assert.deepEqual(Object.keys(handler.properties), ["property"]);
    assert.equal(providedValueOf(handler.properties.property), "parameter");
    assert.equal(handler.properties.property?.modifiers.length, 0);
    assert(Object.hasOwn(handler, "module"));
    assert.ok(handler.module, "RegisterRoute names the responsible module");
    const providerCall = proxyCalls.at(-1);
    assert.equal(providerCall?.kind, "register");
    assert.equal(providerCall?.id, id.toString());
    assert.deepEqual(
      stableFieldsOf(providerCall?.handler),
      stableFieldsOf(handler),
    );
    assert.equal(Object.hasOwn(original, "module"), false);
  });

  it("registers a decorated route with the class that declares it", () => {
    class DeclaringController extends Controller("/lifecycle/declared") {
      @Get("route")
      route() {
        return "declared";
      }
    }

    const registered = getRegisteredRouteHandlers().find(
      ({ handler }) => handler.location === "/lifecycle/declared/route",
    );

    assert(registered);
    assert.strictEqual(registered.handler.controller, DeclaringController);
    assert.equal(Object.hasOwn(registered.handler, "proto"), false);
    UnregisterRoute(Number(registered.id));
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

describe("Controller inheritance", () => {
  it("keeps the parent's parameters when a child redeclares a method of that name", () => {
    class ParentController extends Controller("/lifecycle/family") {
      @Parameter("origin", "query")
      origin?: string | true;

      @Get("same")
      same(@Parameter("parent", "query") parent?: string | true) {
        return parent;
      }
    }
    class ChildController extends ParentController.extend("child") {
      @Parameter("kid", "query")
      override origin?: string | true = undefined;

      @Get("same")
      override same(@Parameter("child", "query") child?: string | true) {
        return child;
      }
    }
    const context = createRequestContext();
    context.url = new URL(
      "http://127.0.0.1:5010/?parent=P&child=C&origin=O&kid=K",
    );
    const handlerAtLocation = (location: string) =>
      getRegisteredRouteHandlers().find(
        ({ handler }) => handler.location === location,
      );
    const parent = handlerAtLocation("/lifecycle/family/same");
    const child = handlerAtLocation("/lifecycle/family/child/same");
    assert(parent && child);

    assert.strictEqual(parent.handler.controller, ParentController);
    assert.strictEqual(child.handler.controller, ChildController);
    assert.deepEqual(
      [parent, child].map(({ handler }) => [
        handler.parameters[0]?.provider?.(context),
        handler.properties.origin?.provider?.(context),
      ]),
      [
        ["P", "O"],
        ["C", "K"],
      ],
      "Each handler reads its own class's parameter and property decorators",
    );
    UnregisterRoute(Number(parent.id));
    UnregisterRoute(Number(child.id));
  });

  it("gives an override that declares no decorators the parent's parameters", () => {
    class ParentController extends Controller("/lifecycle/bare") {
      @Get("same")
      same(@Parameter("parent", "query") parent?: string | true) {
        return parent;
      }
    }
    class ChildController extends ParentController.extend("child") {
      @Get("same")
      override same(renamed?: string | true) {
        return renamed;
      }
    }
    const context = createRequestContext();
    context.url = new URL("http://127.0.0.1:5010/?parent=P");
    const child = getRegisteredRouteHandlers().find(
      ({ handler }) => handler.location === "/lifecycle/bare/child/same",
    );
    assert(child);

    assert.strictEqual(child.handler.controller, ChildController);
    assert.equal(child.handler.parameters[0]?.provider?.(context), "P");
    for (const { id, handler } of getRegisteredRouteHandlers()) {
      if (handler.location.startsWith("/lifecycle/bare")) {
        UnregisterRoute(Number(id));
      }
    }
  });

  it("keeps the parent decorator of each parameter index that an override leaves undecorated", () => {
    class ParentController extends Controller("/lifecycle/partial") {
      @Get("same")
      same(@Parameter("parent", "query") parent?: string | true) {
        return parent;
      }
    }
    class ChildController extends ParentController.extend("child") {
      @Get("same")
      override same(
        skipped?: string | true,
        @Parameter("child", "query") child?: string | true,
      ) {
        return `${skipped}${child}`;
      }
    }
    const context = createRequestContext();
    context.url = new URL("http://127.0.0.1:5010/?parent=P&child=C");
    const child = getRegisteredRouteHandlers().find(
      ({ handler }) => handler.location === "/lifecycle/partial/child/same",
    );
    assert(child);

    assert.strictEqual(child.handler.controller, ChildController);
    assert.equal(child.handler.parameters[0]?.provider?.(context), "P");
    assert.equal(child.handler.parameters[1]?.provider?.(context), "C");
    for (const { id, handler } of getRegisteredRouteHandlers()) {
      if (handler.location.startsWith("/lifecycle/partial")) {
        UnregisterRoute(Number(id));
      }
    }
  });
});
