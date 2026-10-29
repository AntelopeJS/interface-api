import sinon from "sinon";
import {
  Context,
  Controller,
  Delete,
  Get,
  HandlerPriority,
  Parameter,
  PartialController,
  Post,
  Postfix,
  Prefix,
  Put,
  type RequestContext,
  Route,
} from "../index";

import { FetchTest, SpyMethod, spyOf } from "./fetch-test";

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

function controllerRoutingTests(): void {
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
      sinon.assert.notCalled(spyOf(TestPartialControllerCreate, "testCreate"));
    },
  });

  FetchTest("Classic controller still works", {
    route: "/partial/classic/testClassic",
    method: "GET",
    status: 200,
    result: "classic",
  });
}

function handlerRoutingTests(): void {
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
}

describe("Routing", () => {
  describe("Controller", () => {
    controllerRoutingTests();
  });
  describe("Handler", () => {
    handlerRoutingTests();
  });
});
