import WebSocket from "ws";
import assert from "node:assert";
import sinon from "sinon";
import {
  Connection,
  Context,
  Controller,
  Get,
  HandlerPriority,
  HTTPResult,
  Monitor,
  type RequestContext,
  Result,
  WebsocketHandler,
} from "../index";

import { FetchTest, SpyMethod, spyOf, URL_BASE } from "./fetch-test";
import { isRequestContext } from "./request-context";

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

function responseIsolationTests(): void {
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
}

function websocketMonitorTests(): void {
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
    const context: unknown = spy.lastCall.args[0];
    assert(isRequestContext(context), "Monitor receives a request context");
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
    const context: unknown = spy.lastCall.args[0];
    assert(isRequestContext(context), "Monitor receives a request context");
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
      const context: unknown = spy.lastCall.args[0];
      assert(isRequestContext(context), "Monitor receives a request context");
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
      const context: unknown = spy.lastCall.args[0];
      assert(isRequestContext(context), "Monitor receives a request context");
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

  responseIsolationTests();

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

  websocketMonitorTests();
});
