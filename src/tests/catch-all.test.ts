import { Controller, Get, Parameter } from "../index";

import { FetchTest, SpyMethod } from "./fetch-test";

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
