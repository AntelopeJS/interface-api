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

function decoratePlainClass() {
  class PlainHandlers {
    @Get()
    list() {
      return "ok";
    }
  }
  return PlainHandlers;
}

describe("Route decorators", () => {
  it("refuse an accessor, which has no method to register", () => {
    assert.throws(decorateAccessor, {
      name: "TypeError",
      message: "Route decorators apply to methods; status has no value",
    });
  });

  it("refuse a method of a class that Controller did not create", () => {
    assert.throws(decoratePlainClass, {
      name: "TypeError",
      message:
        "Route decorators apply to Controller classes; PlainHandlers has no location",
    });
  });
});
