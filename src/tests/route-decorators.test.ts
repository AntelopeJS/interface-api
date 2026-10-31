import assert from "node:assert";

import { Controller, Get } from "../index";

function decorateAccessor() {
  class AccessorController extends Controller("/accessor") {
    @Get()
    get status() {
      return "ok";
    }
  }
  return AccessorController;
}

describe("Route decorators", () => {
  it("refuse an accessor, which has no method to register", () => {
    assert.throws(decorateAccessor, {
      name: "TypeError",
      message: "Route decorators apply to methods; status has no value",
    });
  });
});
