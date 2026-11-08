import {
  Controller,
  Get,
  HandlerPriority,
  HTTPResult,
  Parameter,
  Prefix,
} from "../index";

import { FetchTest } from "./fetch-test";

export class TestControllerPrefixController extends Controller(
  "/prefix/secured",
) {
  @Prefix("get", "", HandlerPriority.HIGHEST)
  checkAuthentication(@Parameter("authorization", "header") role?: string) {
    if (!role) {
      return new HTTPResult(401, "Unauthorized");
    }
  }

  @Prefix("get", "", HandlerPriority.HIGH)
  checkAuthorization(@Parameter("authorization", "header") role?: string) {
    if (role !== "admin") {
      return new HTTPResult(403, "Forbidden");
    }
  }

  @Get("data")
  data() {
    return "data";
  }

  @Get("reports/latest")
  latestReport() {
    return "report";
  }
}

describe("Controller prefix", () => {
  FetchTest("Runs the highest priority prefix first", {
    route: "/prefix/secured/data",
    status: 401,
    result: "Unauthorized",
  });

  FetchTest("Runs the next prefix when the first returns nothing", {
    route: "/prefix/secured/data",
    status: 403,
    result: "Forbidden",
    prepare(init) {
      init.headers = { authorization: "user" };
    },
  });

  FetchTest("Runs the route when every prefix returns nothing", {
    route: "/prefix/secured/data",
    status: 200,
    result: "data",
    prepare(init) {
      init.headers = { authorization: "admin" };
    },
  });

  FetchTest("Runs the prefixes on a nested route", {
    route: "/prefix/secured/reports/latest",
    status: 401,
    result: "Unauthorized",
  });
});
