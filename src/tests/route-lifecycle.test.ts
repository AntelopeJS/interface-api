import assert from "node:assert";
import {
  type ComputedParameter,
  getRegisteredRoutes,
  HandlerPriority,
  ObserveRegisteredRoutes,
  type RegisteredRoutesObserver,
  RegisterRoute,
  type RouteHandler,
  routesProxy,
  UnregisterRoute,
} from "../index";

interface RegisteredRouteEvent {
  handler: RouteHandler;
  id: string;
}

interface ProxyCall {
  handler?: RouteHandler;
  id: string;
  kind: "register" | "unregister";
}

type RouteRegistrationCallback = (id: string, handler: RouteHandler) => void;

class RecordingRoutesObserver implements RegisteredRoutesObserver {
  registered: RegisteredRouteEvent[] = [];
  unregistered: string[] = [];

  onRegister(id: string, handler: RouteHandler): void {
    this.registered.push({ id, handler });
  }

  onUnregister(id: string): void {
    this.unregistered.push(id);
  }

  clear(): void {
    this.registered.length = 0;
    this.unregistered.length = 0;
  }
}

class CallbackRoutesObserver extends RecordingRoutesObserver {
  constructor(private readonly callback: RouteRegistrationCallback) {
    super();
  }

  override onRegister(id: string, handler: RouteHandler): void {
    super.onRegister(id, handler);
    this.callback(id, handler);
  }
}

class ThrowingRoutesObserver implements RegisteredRoutesObserver {
  isThrowing = false;

  onRegister(): void {
    if (this.isThrowing) {
      throw new Error("Register observer failure");
    }
  }

  onUnregister(): void {
    if (this.isThrowing) {
      throw new Error("Unregister observer failure");
    }
  }
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

describe("ObserveRegisteredRoutes", () => {
  const routeIds: number[] = [];
  const subscriptions: Array<() => void> = [];

  function register(handler: RouteHandler): number {
    const id = RegisterRoute(handler);
    routeIds.push(id);
    return id;
  }

  function observe(observer: RegisteredRoutesObserver): () => void {
    const unsubscribe = ObserveRegisteredRoutes(observer);
    subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  afterEach(() => {
    for (const unsubscribe of subscriptions.splice(0)) {
      unsubscribe();
    }
    for (const id of routeIds.splice(0)) {
      UnregisterRoute(id);
    }
  });

  it("synchronously replays complete registered handlers", () => {
    const original = completeHandlerAt("/observer/replay");
    const id = register(original);
    const observer = new RecordingRoutesObserver();

    observe(observer);

    const event = observer.registered.find(
      (registered) => registered.id === id.toString(),
    );
    assert(event);
    assert.equal(event.handler.mode, original.mode);
    assert.strictEqual(event.handler.callback, original.callback);
    assert.strictEqual(event.handler.proto, original.proto);
    assert.strictEqual(event.handler.parameters, original.parameters);
    assert.strictEqual(event.handler.properties, original.properties);
    assert.equal(event.handler.priority, original.priority);
    assert(Object.hasOwn(event.handler, "module"));
    assert.equal(typeof event.handler.module, "string");
  });

  it("emits live registrations without replacing the route provider", () => {
    const observer = new RecordingRoutesObserver();
    observe(observer);
    observer.clear();
    const original = completeHandlerAt("/observer/live");

    const id = register(original);

    assert.equal(observer.registered.length, 1);
    assert.equal(observer.registered[0].id, id.toString());
    const providerCall = proxyCalls.at(-1);
    assert.equal(providerCall?.kind, "register");
    assert.equal(providerCall?.id, id.toString());
    assert.strictEqual(providerCall?.handler, observer.registered[0].handler);
    assert.equal(Object.hasOwn(original, "module"), false);
  });

  it("emits explicit route removals", () => {
    const observer = new RecordingRoutesObserver();
    observe(observer);
    observer.clear();
    const id = register(handlerAt("/observer/unregister"));
    observer.clear();

    UnregisterRoute(id);

    assert.deepEqual(observer.unregistered, [id.toString()]);
  });

  it("emits removals caused by module unload", () => {
    const observer = new RecordingRoutesObserver();
    observe(observer);
    observer.clear();
    const id = register(handlerAt("/observer/module-unload"));
    const module = observer.registered[0].handler.module;
    assert(module);
    observer.clear();

    routesProxy.unregisterModule(module);

    assert.deepEqual(observer.unregistered, [id.toString()]);
    assert.equal(routesAt("/observer/module-unload"), 0);
  });

  it("multicasts registrations and removals", () => {
    const first = new RecordingRoutesObserver();
    const second = new RecordingRoutesObserver();
    observe(first);
    observe(second);
    first.clear();
    second.clear();

    const id = register(handlerAt("/observer/multicast"));
    UnregisterRoute(id);

    assert.deepEqual(
      [first, second].map((observer) => observer.registered[0].id),
      [id.toString(), id.toString()],
    );
    assert.deepEqual(
      [first, second].map((observer) => observer.unregistered[0]),
      [id.toString(), id.toString()],
    );
  });

  it("does not duplicate live events for observers added during emission", () => {
    const location = "/observer/reentrant-subscription";
    const second = new RecordingRoutesObserver();
    const first = new CallbackRoutesObserver((_id, handler) => {
      if (handler.location === location) {
        observe(second);
      }
    });
    observe(first);

    const id = register(handlerAt(location));

    assert.equal(
      second.registered.filter((event) => event.id === id.toString()).length,
      1,
    );
  });

  it("does not notify observers removed during emission", () => {
    const location = "/observer/reentrant-unsubscribe";
    let unsubscribeSecond = () => {};
    const first = new CallbackRoutesObserver((_id, handler) => {
      if (handler.location === location) {
        unsubscribeSecond();
      }
    });
    const second = new RecordingRoutesObserver();
    observe(first);
    unsubscribeSecond = observe(second);
    first.clear();
    second.clear();

    register(handlerAt(location));

    assert.deepEqual(second.registered, []);
  });

  it("does not emit stale registrations after reentrant removal", () => {
    const location = "/observer/reentrant-removal";
    const first = new CallbackRoutesObserver((id, handler) => {
      if (handler.location === location) {
        UnregisterRoute(Number(id));
      }
    });
    const second = new RecordingRoutesObserver();
    observe(first);
    observe(second);
    first.clear();
    second.clear();

    const id = register(handlerAt(location));

    assert.equal(
      second.registered.some((event) => event.id === id.toString()),
      false,
    );
    assert(second.unregistered.includes(id.toString()));
  });

  it("skips routes removed during synchronous replay", () => {
    const triggerLocation = "/observer/replay-trigger";
    register(handlerAt(triggerLocation));
    const removedId = register(handlerAt("/observer/replay-removed"));
    const observer = new CallbackRoutesObserver((_id, handler) => {
      if (handler.location === triggerLocation) {
        UnregisterRoute(removedId);
      }
    });

    observe(observer);

    assert.equal(
      observer.registered.some((event) => event.id === removedId.toString()),
      false,
    );
    assert(observer.unregistered.includes(removedId.toString()));
  });

  it("returns an idempotent unsubscribe function", () => {
    const observer = new RecordingRoutesObserver();
    const unsubscribe = observe(observer);
    observer.clear();

    unsubscribe();
    unsubscribe();
    register(handlerAt("/observer/unsubscribed"));

    assert.deepEqual(observer.registered, []);
    assert.deepEqual(observer.unregistered, []);
  });

  it("isolates throwing observers from routing and other observers", () => {
    const throwing = new ThrowingRoutesObserver();
    const recording = new RecordingRoutesObserver();
    observe(throwing);
    observe(recording);
    recording.clear();
    throwing.isThrowing = true;

    let id = -1;
    assert.doesNotThrow(() => {
      id = register(handlerAt("/observer/throwing"));
    });
    assert.doesNotThrow(() => UnregisterRoute(id));

    assert.equal(recording.registered[0].id, id.toString());
    assert.deepEqual(recording.unregistered, [id.toString()]);
    assert.equal(proxyCalls.at(-1)?.kind, "unregister");
    assert.equal(proxyCalls.at(-1)?.id, id.toString());
  });
});
