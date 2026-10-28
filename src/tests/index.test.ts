import WebSocket from "ws";
import assert from "node:assert";
import { PassThrough } from "node:stream";
import sinon, { type SinonSpy } from "sinon";
import { type IncomingMessage, ServerResponse } from "node:http";
import {
  MakeMethodDecorator,
  MakeParameterAndPropertyDecorator,
} from "@antelopejs/interface-core/decorators";
import {
  Connection,
  Context,
  Controller,
  Delete,
  Get,
  GetControllerInstance,
  HandlerPriority,
  HTTPResult,
  Monitor,
  MultiParameter,
  Parameter,
  PartialController,
  Post,
  Postfix,
  Prefix,
  Put,
  RawBody,
  type RequestContext,
  Result,
  Route,
  SetParameterProvider,
  Transform,
  WebsocketHandler,
  WriteStream,
} from "@antelopejs/interface-api";

import {
  DEFAULT_REQUEST_BODY_LIMIT,
  HTTPResult as LocalHTTPResult,
  ReadBody,
  StreamBody,
} from "../index";
import { createRequest, createRequestContext } from "./request-context";

const spies = new Map<object, Map<PropertyKey, SinonSpy>>();

const SpyMethod = MakeMethodDecorator((target, key, descriptor) => {
  const spy = sinon.spy(descriptor.value);
  descriptor.value = spy;
  const controllerSpies = spies.get(target) ?? new Map<PropertyKey, SinonSpy>();
  controllerSpies.set(key, spy);
  spies.set(target, controllerSpies);
});

function spyOf<T extends object>(
  controller: { prototype: T },
  key: keyof T & string,
): SinonSpy {
  const spy = spies.get(controller.prototype)?.get(key);
  assert(spy, `${key} is decorated with @SpyMethod`);
  return spy;
}

const URL_BASE = "http://127.0.0.1:5010";

interface FetchTestOptions {
  route: string;
  status: number;
  method?: string;
  result?: string;
  callCount?: [SinonSpy, number];
  prepare?: (
    this: Mocha.Context,
    init: RequestInit,
    options: FetchTestOptions,
  ) => void | Promise<void>;
  postCheck?: (
    this: Mocha.Context,
    res: Response,
    options: FetchTestOptions,
  ) => void | Promise<void>;
}

function FetchTest(name: string, options: FetchTestOptions) {
  it(`${name}: ${options.method ?? "GET"} ${options.route}`, async function () {
    const init: RequestInit = { method: options.method ?? "GET" };
    if (options.prepare) {
      await options.prepare.apply(this, [init, options]);
    }
    const res = await fetch(URL_BASE + options.route, init);
    if (res.status !== options.status) {
      throw new Error(
        `Wrong response status (expected ${options.status}, got ${res.status}): ${await res.text()}`,
      );
    }
    if (options.result !== undefined) {
      assert.equal(await res.text(), options.result, "Incorrect response body");
    }
    if (options.callCount) {
      sinon.assert.callCount(options.callCount[0], options.callCount[1]);
    }
    if (options.postCheck) {
      await options.postCheck.apply(this, [res, options]);
    }
  });
}

export class TestRoutingController0 extends Controller("/") {
  @Get()
  test() {}

  @Prefix("get", "testPriority", HandlerPriority.HIGH)
  @SpyMethod()
  testPrefixHigh() {}

  @Prefix("get", "testPriority", HandlerPriority.LOW)
  @SpyMethod()
  testPrefixLow() {}

  @Get()
  @SpyMethod()
  testPriority() {}

  @Postfix("get", "testPriority", HandlerPriority.HIGH)
  @SpyMethod()
  testPostfixHigh() {}

  @Postfix("get", "testPriority", HandlerPriority.LOW)
  @SpyMethod()
  testPostfixLow() {}

  @Prefix("get", "testEarlyReturn")
  @SpyMethod()
  testPrefixEarlyReturn() {
    return "Ok Early";
  }

  @Get()
  @SpyMethod()
  testEarlyReturn() {
    return "Not Ok";
  }

  @Get()
  @SpyMethod()
  testOverride() {
    return "Not Ok";
  }

  @Postfix("get", "testOverride")
  @SpyMethod()
  testPostfixOverride() {
    return "Ok Override";
  }
}

export class TestRoutingController1 extends Controller("/routing/controller1") {
  @Get()
  @SpyMethod()
  test() {
    return "Ok";
  }

  @Post("test")
  @SpyMethod()
  testPost() {
    return "Ok Post";
  }

  @Put("test")
  @SpyMethod()
  testPut() {
    return "Ok Put";
  }

  @Delete("test")
  @SpyMethod()
  testDelete() {
    return "Ok Delete";
  }

  @Route("handler", "patch", "test")
  @SpyMethod()
  testCustom() {
    return "Ok Patch";
  }
}

export class TestRoutingController2 extends TestRoutingController1.extend(
  "/explicit",
) {
  @Get()
  test() {
    return "Ok 2";
  }
}

export class TestRoutingController3 extends Controller(
  "///routing///controller2///",
) {
  @Get()
  test() {}
}

export class TestPartialControllerParent extends Controller(
  "/partial/controller",
) {
  @Context()
  declare ctx: RequestContext;
}

export class TestPartialControllerGetById extends PartialController(
  TestPartialControllerParent,
) {
  @Get(":id")
  @SpyMethod()
  test(@Parameter("id") id: string) {
    return `${id}:${this.ctx.url.pathname}`;
  }
}

export class TestPartialControllerCreate extends PartialController(
  TestPartialControllerParent,
) {
  @Post("")
  @SpyMethod()
  testCreate() {
    return this.ctx.url.pathname;
  }
}

export class TestPartialControllerClassic extends Controller(
  "/partial/classic",
) {
  @Get()
  @SpyMethod()
  testClassic() {
    return "classic";
  }
}

describe("Routing", () => {
  describe("Controller", () => {
    FetchTest("Root Controller", {
      route: "/test",
      method: "GET",
      status: 200,
    });

    FetchTest("Normal Controller", {
      route: "/routing/controller1/test",
      method: "GET",
      status: 200,
      result: "Ok",
    });

    FetchTest("Extended Controller", {
      route: "/routing/controller1/explicit/test",
      method: "GET",
      status: 200,
      result: "Ok 2",
    });

    FetchTest("Redundant Slash Controller", {
      route: "/routing/controller2/test",
      method: "GET",
      status: 200,
    });

    FetchTest("Partial Controller keeps parent location", {
      route: "/partial/controller/123",
      method: "GET",
      status: 200,
      result: "123:/partial/controller/123",
    });

    FetchTest("Partial Controller inherits computed properties", {
      route: "/partial/controller",
      method: "POST",
      status: 200,
      result: "/partial/controller",
    });

    FetchTest("Multiple partial controllers can coexist", {
      route: "/partial/controller/hello",
      method: "GET",
      status: 200,
      result: "hello:/partial/controller/hello",
      prepare() {
        spyOf(TestPartialControllerGetById, "test").resetHistory();
        spyOf(TestPartialControllerCreate, "testCreate").resetHistory();
      },
      callCount: [spyOf(TestPartialControllerGetById, "test"), 1],
      postCheck() {
        sinon.assert.notCalled(
          spyOf(TestPartialControllerCreate, "testCreate"),
        );
      },
    });

    FetchTest("Classic controller still works", {
      route: "/partial/classic/testClassic",
      method: "GET",
      status: 200,
      result: "classic",
    });
  });

  describe("Handler", () => {
    const testRoute1 = spyOf(TestRoutingController1, "test");

    FetchTest("Normal Call", {
      route: "/routing/controller1/test",
      method: "GET",
      status: 200,
      callCount: [testRoute1, 1],
      prepare: () => testRoute1.resetHistory(),
    });

    FetchTest("Options Call", {
      route: "/routing/controller1/test",
      method: "OPTIONS",
      status: 404,
      callCount: [testRoute1, 0],
      prepare: () => testRoute1.resetHistory(),
    });

    FetchTest("Head Call", {
      route: "/routing/controller1/test",
      method: "HEAD",
      status: 200,
      result: "",
      callCount: [testRoute1, 1],
      prepare: () => testRoute1.resetHistory(),
    });

    FetchTest("Post Call", {
      route: "/routing/controller1/test",
      method: "POST",
      status: 200,
      result: "Ok Post",
    });

    FetchTest("Put Call", {
      route: "/routing/controller1/test",
      method: "PUT",
      status: 200,
      result: "Ok Put",
    });

    FetchTest("Delete Call", {
      route: "/routing/controller1/test",
      method: "DELETE",
      status: 200,
      result: "Ok Delete",
    });

    FetchTest("Custom Call (PATCH)", {
      route: "/routing/controller1/test",
      method: "PATCH",
      status: 200,
      result: "Ok Patch",
    });

    FetchTest("Prefix Priority", {
      route: "/testPriority",
      method: "GET",
      status: 200,
      postCheck: () => {
        sinon.assert.callOrder(
          spyOf(TestRoutingController0, "testPrefixHigh"),
          spyOf(TestRoutingController0, "testPrefixLow"),
          spyOf(TestRoutingController0, "testPriority"),
        );
      },
    });

    FetchTest("Prefix Early Return", {
      route: "/testEarlyReturn",
      method: "GET",
      status: 200,
      result: "Ok Early",
      callCount: [spyOf(TestRoutingController0, "testEarlyReturn"), 0],
    });

    FetchTest("Postfix Priority", {
      route: "/testPriority",
      method: "GET",
      status: 200,
      postCheck: () => {
        sinon.assert.callOrder(
          spyOf(TestRoutingController0, "testPriority"),
          spyOf(TestRoutingController0, "testPostfixHigh"),
          spyOf(TestRoutingController0, "testPostfixLow"),
        );
      },
    });

    FetchTest("Postfix Override", {
      route: "/testOverride",
      method: "GET",
      status: 200,
      result: "Ok Override",
      callCount: [spyOf(TestRoutingController0, "testOverride"), 1],
    });
  });
});

const ConstantProvider = MakeParameterAndPropertyDecorator(
  (target, key, index, value: any) =>
    SetParameterProvider(target, key, index, () => value),
);

export class TestExecutionController1 extends Controller(
  "/execution/controller1",
) {
  @ConstantProvider("Ok")
  declare prop: string;

  @Get()
  @SpyMethod()
  testProperty() {
    return this.prop;
  }

  @Get()
  @SpyMethod()
  testParameter(@ConstantProvider("Ok") param: string) {
    return param;
  }
}

export class TestExecutionController2 extends Controller(
  "/execution/controller2",
) {
  @Get()
  @SpyMethod()
  testProviderContext(@Context() _ctx: RequestContext) {}

  @Post()
  @SpyMethod()
  testProviderRawBody(@RawBody() _body: Buffer) {}

  @Get("testProviderParameterParam/:key")
  @SpyMethod()
  testProviderParameterParam(@Parameter("key", "param") _param: string) {}

  @Get()
  @SpyMethod()
  testProviderParameterHeader(@Parameter("key", "header") _param: string) {}

  @Get()
  @SpyMethod()
  testProviderParameterQuery(@Parameter("key", "query") _param: string) {}

  @Get()
  @SpyMethod()
  testProviderMultiParameterHeader(
    @MultiParameter("key", "header") _params: string[],
  ) {}

  @Get()
  @SpyMethod()
  testProviderMultiParameterQuery(
    @MultiParameter("key", "query") _params: string[],
  ) {}

  @Get()
  @SpyMethod()
  testProviderWriteStream(@WriteStream() param: PassThrough) {
    param.write("Ok");
    param.end();
  }

  @Get()
  testProviderResult() {
    return "Ok";
  }

  @Postfix("get", "testProviderResult")
  @SpyMethod()
  testProviderResultPostfix(@Result() _res: string) {}

  @Get()
  @SpyMethod()
  testModifierTransform(
    @ConstantProvider("O")
    @Transform((_ctx, val) => `${String(val)}k`)
    _param: string,
  ) {}
}

export class TestExecutionController3 extends Controller(
  "/execution/controller3",
) {
  @Get()
  test() {
    return new HTTPResult();
  }

  @Get()
  testThrow() {
    throw new HTTPResult();
  }

  @Get()
  testStatus() {
    return new HTTPResult(201);
  }

  @Get()
  testHeader() {
    const res = new HTTPResult(200);
    res.addHeader("key", "Ok");
    return res;
  }

  @Get()
  testBody() {
    return new HTTPResult(200, "Ok", "text/plain");
  }

  @Postfix("get", "testConsistency")
  testConsistencyPrefix(@Result() res: HTTPResult) {
    res.addHeader("key1", "Ok");
  }

  @Get()
  testConsistency(@Result() res: HTTPResult) {
    res.addHeader("key2", "Ok");
    res.setStatus(200);
    res.setBody("Ok", "text/plain");
    return res;
  }

  @Postfix("get", "testConsistency")
  testConsistencyPostfix(@Result() res: HTTPResult) {
    res.addHeader("key3", "Ok");
  }

  @Get()
  @SpyMethod()
  async testControllerInstance(@Context() ctx: RequestContext) {
    const controller1 = await GetControllerInstance(
      TestExecutionController1,
      ctx,
    );
    return controller1.prop;
  }
}

describe("Execution", () => {
  FetchTest("Property Access", {
    route: "/execution/controller1/testProperty",
    method: "GET",
    status: 200,
    result: "Ok",
  });

  FetchTest("Parameter Access", {
    route: "/execution/controller1/testParameter",
    method: "GET",
    status: 200,
    result: "Ok",
  });

  FetchTest("GetControllerInstance", {
    route: "/execution/controller3/testControllerInstance",
    method: "GET",
    status: 200,
    result: "Ok",
  });

  describe("Providers", () => {
    FetchTest("Context", {
      route: "/execution/controller2/testProviderContext",
      method: "GET",
      status: 200,
      postCheck() {
        const res: RequestContext = spyOf(
          TestExecutionController2,
          "testProviderContext",
        ).lastCall.args[0];
        assert.equal(
          res.url.pathname,
          "/execution/controller2/testProviderContext",
          "Context request URL",
        );
        assert(res.rawRequest, "Context object");
      },
    });

    FetchTest("RawBody", {
      route: "/execution/controller2/testProviderRawBody",
      method: "POST",
      status: 200,
      prepare(init) {
        init.body = "Test";
      },
      postCheck() {
        const res = spyOf(TestExecutionController2, "testProviderRawBody")
          .lastCall.args[0];
        assert(Buffer.isBuffer(res), "Buffer object");
        assert.equal(res.toString(), "Test");
      },
    });

    FetchTest("Parameter (param)", {
      route: "/execution/controller2/testProviderParameterParam/Ok",
      method: "GET",
      status: 200,
      postCheck() {
        assert.equal(
          spyOf(TestExecutionController2, "testProviderParameterParam").lastCall
            .args[0],
          "Ok",
          "Parameter value",
        );
      },
    });

    FetchTest("Parameter (header)", {
      route: "/execution/controller2/testProviderParameterHeader",
      method: "GET",
      status: 200,
      prepare(init) {
        init.headers = { key: "Ok" };
      },
      postCheck() {
        assert.equal(
          spyOf(TestExecutionController2, "testProviderParameterHeader")
            .lastCall.args[0],
          "Ok",
          "Parameter value",
        );
      },
    });

    FetchTest("Parameter (query)", {
      route: "/execution/controller2/testProviderParameterQuery?key=Ok",
      method: "GET",
      status: 200,
      postCheck() {
        assert.equal(
          spyOf(TestExecutionController2, "testProviderParameterQuery").lastCall
            .args[0],
          "Ok",
          "Parameter value",
        );
      },
    });

    FetchTest("MultiParameter (header)", {
      route: "/execution/controller2/testProviderMultiParameterHeader",
      method: "GET",
      status: 200,
      prepare(init) {
        init.headers = { key: ["Ok 1", "Ok 2"] };
      },
      postCheck() {
        assert.equal(
          spyOf(
            TestExecutionController2,
            "testProviderMultiParameterHeader",
          ).lastCall.args[0].toString(),
          ["Ok 1", "Ok 2"].toString(),
          "Parameter value",
        );
      },
    });

    FetchTest("MultiParameter (query)", {
      route:
        "/execution/controller2/testProviderMultiParameterQuery?key=Ok1&key=Ok2",
      method: "GET",
      status: 200,
      postCheck() {
        assert.equal(
          spyOf(
            TestExecutionController2,
            "testProviderMultiParameterQuery",
          ).lastCall.args[0].toString(),
          ["Ok1", "Ok2"].toString(),
          "Parameter value",
        );
      },
    });

    FetchTest("Result", {
      route: "/execution/controller2/testProviderResult",
      method: "GET",
      status: 200,
      postCheck() {
        const res = spyOf(TestExecutionController2, "testProviderResultPostfix")
          .lastCall.args[0];
        assert(res instanceof HTTPResult, "HTTPResult object");
        assert.equal(res.getBody(), "Ok", "HTTPResult value");
      },
    });

    FetchTest("WriteStream", {
      route: "/execution/controller2/testProviderWriteStream",
      method: "Get",
      status: 200,
      result: "Ok",
      postCheck() {
        const res = spyOf(TestExecutionController2, "testProviderWriteStream")
          .lastCall.args[0];
        assert(res instanceof PassThrough, "Stream object");
      },
    });
  });

  describe("Modifiers", () => {
    FetchTest("Transform", {
      route: "/execution/controller2/testModifierTransform",
      method: "GET",
      status: 200,
      postCheck() {
        assert.equal(
          spyOf(TestExecutionController2, "testModifierTransform").lastCall
            .args[0],
          "Ok",
          "Parameter value",
        );
      },
    });
  });

  describe("HTTPResult", () => {
    FetchTest("Normal Return", {
      route: "/execution/controller3/test",
      method: "GET",
      status: 200,
    });

    FetchTest("Throw", {
      route: "/execution/controller3/testThrow",
      method: "GET",
      status: 200,
    });

    FetchTest("Status", {
      route: "/execution/controller3/testStatus",
      method: "GET",
      status: 201,
    });

    FetchTest("Header", {
      route: "/execution/controller3/testHeader",
      method: "GET",
      status: 200,
      postCheck(res) {
        assert.equal(res.headers.get("key"), "Ok", "Header value");
      },
    });

    FetchTest("Body", {
      route: "/execution/controller3/testBody",
      method: "GET",
      status: 200,
      result: "Ok",
    });

    FetchTest("Prefix/Postfix Consistency", {
      route: "/execution/controller3/testConsistency",
      method: "GET",
      status: 200,
      result: "Ok",
      postCheck(res) {
        assert.equal(res.headers.get("key1"), "Ok", "Prefix Header value");
        assert.equal(res.headers.get("key2"), "Ok", "Handler Header value");
        assert.equal(res.headers.get("key3"), "Ok", "Postfix Header value");
      },
    });
  });
});

const monitorHandlerErrorMessage = "Monitor handler error";
const monitorWebsocketErrorMessage = "Monitor websocket error";

export class TestMonitorController1 extends Controller("/monitor/controller1") {
  @Get("success")
  testSuccess() {
    return "Ok Monitor";
  }

  @Monitor("get", "success")
  @SpyMethod()
  testMonitorSuccess(@Context() _ctx: RequestContext) {}

  @Get("error")
  testError() {
    throw new Error(monitorHandlerErrorMessage);
  }

  @Monitor("get", "error")
  @SpyMethod()
  testMonitorError(@Context() _ctx: RequestContext) {}

  @Get("ignoreReturn")
  testIgnoreReturn() {
    return "Handler Response";
  }

  @Monitor("get", "ignoreReturn")
  @SpyMethod()
  testMonitorIgnoredReturn() {
    return "Monitor Response";
  }

  @Get("immutableResponse")
  testImmutableResponse(@Result() response: HTTPResult) {
    response.addHeader("x-handler", "true");
    return "Immutable Response";
  }

  @Monitor("get", "immutableResponse")
  @SpyMethod()
  testMonitorMutateResponse(@Result() response: HTTPResult) {
    response.setStatus(201);
    response.setBody("Mutated Response");
    response.addHeader("x-monitor", "true");
  }

  @Get("throwingMonitor")
  testThrowingMonitor() {
    return "Stable Response";
  }

  @Monitor("get", "throwingMonitor")
  @SpyMethod()
  testThrowingMonitorObserver() {
    throw new Error("Monitor should not break response");
  }

  @Get("priority")
  @SpyMethod()
  testMonitorPriorityHandler() {
    return "Priority Response";
  }

  @Monitor("get", "priority", HandlerPriority.HIGH)
  @SpyMethod()
  testMonitorPriorityHigh() {}

  @Monitor("get", "priority", HandlerPriority.LOW)
  @SpyMethod()
  testMonitorPriorityLow() {}

  @WebsocketHandler("wsSuccess")
  testWebsocketSuccess(@Connection() connection: WebSocket) {
    connection.on("message", () => undefined);
  }

  @Monitor("get", "wsSuccess")
  @SpyMethod()
  testMonitorWebsocketSuccess(@Context() _ctx: RequestContext) {}

  @WebsocketHandler("wsError")
  testWebsocketError() {
    throw new Error(monitorWebsocketErrorMessage);
  }

  @Monitor("get", "wsError")
  @SpyMethod()
  testMonitorWebsocketError(@Context() _ctx: RequestContext) {}
}

describe("Monitor", () => {
  FetchTest("Runs after successful handler", {
    route: "/monitor/controller1/success",
    method: "GET",
    status: 200,
    result: "Ok Monitor",
    prepare() {
      spyOf(TestMonitorController1, "testMonitorSuccess").resetHistory();
    },
    postCheck() {
      const spy = spyOf(TestMonitorController1, "testMonitorSuccess");
      sinon.assert.calledOnce(spy);
      const context: RequestContext = spy.lastCall.args[0];
      assert.equal(
        context.error,
        undefined,
        "Monitor context should not contain an error",
      );
    },
  });

  FetchTest("Runs after handler throw", {
    route: "/monitor/controller1/error",
    method: "GET",
    status: 500,
    result: monitorHandlerErrorMessage,
    prepare() {
      spyOf(TestMonitorController1, "testMonitorError").resetHistory();
    },
    postCheck() {
      const spy = spyOf(TestMonitorController1, "testMonitorError");
      sinon.assert.calledOnce(spy);
      const context: RequestContext = spy.lastCall.args[0];
      assert(
        context.error instanceof Error,
        "Monitor context should include thrown error",
      );
      assert.equal(
        context.error.message,
        monitorHandlerErrorMessage,
        "Monitor error message",
      );
    },
  });

  FetchTest("Ignores monitor return value", {
    route: "/monitor/controller1/ignoreReturn",
    method: "GET",
    status: 200,
    result: "Handler Response",
    prepare() {
      spyOf(TestMonitorController1, "testMonitorIgnoredReturn").resetHistory();
    },
    postCheck() {
      sinon.assert.calledOnce(
        spyOf(TestMonitorController1, "testMonitorIgnoredReturn"),
      );
    },
  });

  FetchTest("Monitor cannot mutate response", {
    route: "/monitor/controller1/immutableResponse",
    method: "GET",
    status: 200,
    result: "Immutable Response",
    prepare() {
      spyOf(TestMonitorController1, "testMonitorMutateResponse").resetHistory();
    },
    postCheck(res) {
      sinon.assert.calledOnce(
        spyOf(TestMonitorController1, "testMonitorMutateResponse"),
      );
      assert.equal(
        res.headers.get("x-handler"),
        "true",
        "Handler response header value",
      );
      assert.equal(
        res.headers.get("x-monitor"),
        null,
        "Monitor must not mutate response headers",
      );
    },
  });

  FetchTest("Monitor throw does not change response", {
    route: "/monitor/controller1/throwingMonitor",
    method: "GET",
    status: 200,
    result: "Stable Response",
    prepare() {
      spyOf(
        TestMonitorController1,
        "testThrowingMonitorObserver",
      ).resetHistory();
    },
    postCheck() {
      sinon.assert.calledOnce(
        spyOf(TestMonitorController1, "testThrowingMonitorObserver"),
      );
    },
  });

  FetchTest("Multiple monitors run by priority", {
    route: "/monitor/controller1/priority",
    method: "GET",
    status: 200,
    result: "Priority Response",
    prepare() {
      spyOf(
        TestMonitorController1,
        "testMonitorPriorityHandler",
      ).resetHistory();
      spyOf(TestMonitorController1, "testMonitorPriorityHigh").resetHistory();
      spyOf(TestMonitorController1, "testMonitorPriorityLow").resetHistory();
    },
    postCheck() {
      sinon.assert.callOrder(
        spyOf(TestMonitorController1, "testMonitorPriorityHandler"),
        spyOf(TestMonitorController1, "testMonitorPriorityHigh"),
        spyOf(TestMonitorController1, "testMonitorPriorityLow"),
      );
    },
  });

  it("Runs on websocket upgrade success", async () => {
    const spy = spyOf(TestMonitorController1, "testMonitorWebsocketSuccess");
    spy.resetHistory();

    const ws = new WebSocket(`${URL_BASE}/monitor/controller1/wsSuccess`);
    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    sinon.assert.calledOnce(spy);
    const context: RequestContext = spy.lastCall.args[0];
    assert.equal(
      context.error,
      undefined,
      "Websocket monitor success should not have an error",
    );

    ws.close();
    await new Promise<void>((resolve) => ws.on("close", () => resolve()));
  });

  it("Runs on websocket upgrade error", async () => {
    const spy = spyOf(TestMonitorController1, "testMonitorWebsocketError");
    spy.resetHistory();

    const ws = new WebSocket(`${URL_BASE}/monitor/controller1/wsError`);
    await new Promise<void>((resolve) => {
      ws.on("close", () => resolve());
      ws.on("error", () => resolve());
      ws.on("open", () => undefined);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    sinon.assert.calledOnce(spy);
    const context: RequestContext = spy.lastCall.args[0];
    assert(
      context.error instanceof Error,
      "Websocket monitor should receive thrown error",
    );
    assert.equal(
      context.error.message,
      monitorWebsocketErrorMessage,
      "Websocket monitor error message",
    );
  });
});

export class TestCatchAllController1 extends Controller("/catchall/terminal") {
  @Get("/::path")
  @SpyMethod()
  testTerminal(@Parameter("path") path: string) {
    return path;
  }
}

export class TestCatchAllController2 extends Controller("/catchall/suffix") {
  @Get("/::path/end")
  @SpyMethod()
  testSuffix(@Parameter("path") path: string) {
    return path;
  }
}

export class TestCatchAllController3 extends Controller("/catchall/priority") {
  @Get("/static/end")
  @SpyMethod()
  testStatic() {
    return "static";
  }

  @Get("/:id/end")
  @SpyMethod()
  testDynamic(@Parameter("id") id: string) {
    return `dynamic:${id}`;
  }

  @Get("/::path/end")
  @SpyMethod()
  testCatchAll(@Parameter("path") path: string) {
    return `catchall:${path}`;
  }
}

describe("Catch-All Routes", () => {
  describe("Terminal", () => {
    FetchTest("Single segment", {
      route: "/catchall/terminal/hello",
      method: "GET",
      status: 200,
      result: "hello",
    });

    FetchTest("Multiple segments", {
      route: "/catchall/terminal/a/b/c",
      method: "GET",
      status: 200,
      result: "a/b/c",
    });

    FetchTest("Deep path", {
      route: "/catchall/terminal/docs/api/v2/readme.txt",
      method: "GET",
      status: 200,
      result: "docs/api/v2/readme.txt",
    });
  });

  describe("Suffix", () => {
    FetchTest("Single segment before suffix", {
      route: "/catchall/suffix/a/end",
      method: "GET",
      status: 200,
      result: "a",
    });

    FetchTest("Multiple segments before suffix", {
      route: "/catchall/suffix/a/b/c/end",
      method: "GET",
      status: 200,
      result: "a/b/c",
    });

    FetchTest("Requires at least one captured segment", {
      route: "/catchall/suffix/end",
      method: "GET",
      status: 404,
    });
  });

  describe("Priority", () => {
    FetchTest("Static route is preferred over catch-all", {
      route: "/catchall/priority/static/end",
      method: "GET",
      status: 200,
      result: "static",
    });

    FetchTest("Dynamic route is preferred over catch-all", {
      route: "/catchall/priority/abc/end",
      method: "GET",
      status: 200,
      result: "dynamic:abc",
    });

    FetchTest("Catch-all is used as fallback", {
      route: "/catchall/priority/a/b/end",
      method: "GET",
      status: 200,
      result: "catchall:a/b",
    });
  });
});

const testWSReceiver = sinon.spy();
let testWSSocket: WebSocket;

export class TestWebsocketController1 extends Controller(
  "/websocket/controller1",
) {
  @WebsocketHandler()
  @SpyMethod()
  test(@Connection() connection: WebSocket) {
    testWSSocket = connection;
    connection.on("message", testWSReceiver);
  }
}

describe("WebSocket", () => {
  let ws: WebSocket;
  const clientReceiver = sinon.spy();

  after(() => ws?.close());

  it("Connect", async () => {
    ws = new WebSocket(`${URL_BASE}/websocket/controller1/test`);
    ws.on("message", clientReceiver);
    await new Promise((resolve, reject) => {
      ws.on("open", resolve);
      ws.on("error", reject);
    });
    assert.equal(ws.readyState, WebSocket.OPEN, "Client connected");
  });

  it("Client -> Server", async () => {
    ws.send("Ok");
    await new Promise((resolve) => setTimeout(resolve, 10));
    sinon.assert.calledOnce(testWSReceiver);
    assert.equal(testWSReceiver.lastCall.firstArg.toString(), "Ok");
  });

  it("Client <- Server", async () => {
    testWSSocket.send("Ok");
    await new Promise((resolve) => setTimeout(resolve, 10));
    sinon.assert.calledOnce(clientReceiver);
    assert.equal(clientReceiver.lastCall.firstArg.toString(), "Ok");
  });

  it("Close", async () => {
    await new Promise((resolve) => {
      ws.on("close", resolve);
      testWSSocket.close();
    });
    assert.equal(
      ws.readyState,
      WebSocket.CLOSED,
      "Client saw the server close",
    );
  });
});

interface BodyTestContext {
  context: RequestContext;
  request: IncomingMessage;
}

function createBodyTestContext(contentLength?: number): BodyTestContext {
  const request = createRequest();
  if (contentLength !== undefined) {
    request.headers["content-length"] = contentLength.toString();
  }
  return { request, context: createRequestContext(request) };
}

function assertBodyListenersRemoved(request: IncomingMessage): void {
  assert.equal(request.listenerCount("data"), 0);
  assert.equal(request.listenerCount("end"), 0);
  assert.equal(request.listenerCount("error"), 0);
}

async function assertPayloadTooLarge(body: Promise<Buffer>): Promise<void> {
  await assert.rejects(body, (error) => {
    assert(error instanceof LocalHTTPResult);
    assert.equal(error.getStatus(), 413);
    assert.equal(error.getBody(), "Payload Too Large");
    return true;
  });
}

describe("ReadBody limits", () => {
  it("Accepts a normal body with the default limit", async () => {
    const test = createBodyTestContext();
    const body = ReadBody(test.context);
    test.request.push("normal body");
    test.request.push(null);

    assert.equal((await body).toString(), "normal body");
    assertBodyListenersRemoved(test.request);
  });

  it("Accepts a body exactly at the configured limit", async () => {
    const test = createBodyTestContext(4);
    const body = ReadBody(test.context, 4);
    test.request.push("test");
    test.request.push(null);

    assert.equal((await body).toString(), "test");
    assertBodyListenersRemoved(test.request);
  });

  it("Rejects an oversized Content-Length before adding listeners", async () => {
    const test = createBodyTestContext(DEFAULT_REQUEST_BODY_LIMIT + 1);

    await assertPayloadTooLarge(ReadBody(test.context));
    assert.equal(test.request.isPaused(), true);
    assertBodyListenersRemoved(test.request);
  });

  it("Rejects and stops an oversized chunked body", async () => {
    const test = createBodyTestContext();
    const body = ReadBody(test.context, 4);
    test.request.push("test");
    test.request.push("!");

    await assertPayloadTooLarge(body);
    assert.equal(test.request.isPaused(), true);
    assertBodyListenersRemoved(test.request);
  });

  it("Applies each limit across concurrent consumers", async () => {
    const test = createBodyTestContext(5);
    const permissiveBody = ReadBody(test.context, 8);
    const strictBody = ReadBody(test.context, 4);
    test.request.push("12345");
    test.request.push(null);

    assert.equal((await permissiveBody).toString(), "12345");
    await assertPayloadTooLarge(strictBody);
    assertBodyListenersRemoved(test.request);
  });

  it("Applies a stricter limit to an already cached body", async () => {
    const test = createBodyTestContext(5);
    const body = ReadBody(test.context, 8);
    test.request.push("12345");
    test.request.push(null);
    assert.equal((await body).toString(), "12345");

    await assertPayloadTooLarge(ReadBody(test.context, 4));
    assertBodyListenersRemoved(test.request);
  });

  it("Resumes for a permissive consumer after an earlier rejection", async () => {
    const test = createBodyTestContext();
    const strictBody = ReadBody(test.context, 4);
    test.request.push("12345");
    await assertPayloadTooLarge(strictBody);

    const body = ReadBody(test.context, 8);
    test.request.push(null);
    assert.equal((await body).toString(), "12345");
    assertBodyListenersRemoved(test.request);
  });
});

function createCapturedResponse() {
  const response = new ServerResponse(createRequest());
  return {
    response,
    writeHead: sinon.spy(response, "writeHead"),
    end: sinon.spy(response, "end"),
  };
}

describe("StreamBody", () => {
  it("Yields the body chunks as they arrive", async () => {
    const test = createBodyTestContext();
    const chunks: string[] = [];
    const reading = (async () => {
      for await (const chunk of StreamBody(test.context))
        chunks.push(Buffer.from(chunk).toString());
    })();
    test.request.push("ab");
    test.request.push("c");
    test.request.push(null);
    await reading;
    assert.equal(chunks.join(""), "abc");
  });

  it("Applies no buffered limit", async () => {
    const size = DEFAULT_REQUEST_BODY_LIMIT + 1;
    const test = createBodyTestContext(size);
    let received = 0;
    const reading = (async () => {
      for await (const chunk of StreamBody(test.context))
        received += chunk.byteLength;
    })();
    test.request.push(Buffer.alloc(size));
    test.request.push(null);
    await reading;
    assert.equal(received, size);
  });

  it("Discards the rest of the body when the reader stops early", async () => {
    const test = createBodyTestContext();
    test.request.push("first");
    for await (const _chunk of StreamBody(test.context)) break;
    const drained = new Promise((resolve) => test.request.once("end", resolve));
    test.request.push("rest");
    test.request.push(null);
    await drained;
    assert.equal(
      test.request.readableEnded,
      true,
      "A destroyed request never ends: reaching end shows the rest was read",
    );
  });
});

describe("HTTPResult response contract", () => {
  it("Serializes object bodies immediately", () => {
    const body = { message: "before" };
    const result = new LocalHTTPResult(200, body);

    body.message = "after";

    assert.equal(result.getBody(), '{"message":"before"}');
    assert.equal(result.getContentType(), "application/json");
  });

  it("Peeks at headers without creating the mutable store", () => {
    const result = new LocalHTTPResult();

    assert.equal(result.peekHeaders(), undefined);

    result.addHeader("X-Added", "yes");
    assert.equal(result.peekHeaders()?.["X-Added"], "yes");

    const headers = result.getHeaders();
    assert.strictEqual(result.peekHeaders(), headers);
    headers["X-Mutable"] = "yes";
    assert.equal(result.peekHeaders()?.["X-Mutable"], "yes");
  });

  it("Sends the current own headers, content type, status, and body", () => {
    const result = new LocalHTTPResult(202, { ok: true });
    const headers = result.getHeaders();
    Object.setPrototypeOf(headers, { "X-Inherited": "excluded" });
    headers["X-Current"] = "current";
    result.addHeader("Content-Type", "text/html");
    const captured = createCapturedResponse();

    result.sendResponse(captured.response);

    const sent = captured.writeHead.firstCall.args[1];
    assert(sent !== undefined && !Array.isArray(sent), "Headers object sent");
    assert.equal(captured.response.statusCode, 202);
    assert.equal(captured.end.firstCall.args[0], '{"ok":true}');
    assert.equal(sent["X-Current"], "current");
    assert.equal(sent["X-Inherited"], undefined);
    assert.equal(sent["Content-Type"], "application/json");
  });

  it("Sends HEAD without a body and closes an attached stream", () => {
    const result = new LocalHTTPResult(204, { ignored: true });
    const stream = result.getWriteStream("text/event-stream", 206);
    const captured = createCapturedResponse();

    result.sendHeadResponse(captured.response);

    const sent = captured.writeHead.firstCall.args[1];
    assert(sent !== undefined && !Array.isArray(sent), "Headers object sent");
    assert.equal(captured.response.statusCode, 206);
    assert.equal(captured.end.firstCall.args[0], undefined);
    assert.equal(sent["Content-Type"], "text/event-stream");
    assert.equal(captured.response.writableEnded, true);
    assert.equal(stream.writableEnded, true);
  });

  it("Ends an aborted stream response without piping", () => {
    const result = new LocalHTTPResult();
    result.getWriteStream();
    const captured = createCapturedResponse();

    result.sendResponse(captured.response, true);

    assert.equal(captured.response.statusCode, 200);
    assert.equal(captured.end.firstCall.args[0], "");
    assert.equal(captured.response.writableEnded, true);
  });
});
