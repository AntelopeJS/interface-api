import assert from "node:assert";
import { PassThrough } from "node:stream";
import { MakeParameterAndPropertyDecorator } from "@antelopejs/interface-core/decorators";
import {
  Context,
  Controller,
  Get,
  GetControllerInstance,
  HTTPResult,
  MultiParameter,
  Parameter,
  Post,
  Postfix,
  RawBody,
  type RequestContext,
  Result,
  SetParameterProvider,
  Transform,
  WriteStream,
} from "@antelopejs/interface-api";

import { FetchTest, SpyMethod, spyOf } from "./fetch-test";

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

function parameterProviderTests(): void {
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
        spyOf(TestExecutionController2, "testProviderParameterHeader").lastCall
          .args[0],
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
}

function httpResultTests(): void {
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

    parameterProviderTests();

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
    httpResultTests();
  });
});
