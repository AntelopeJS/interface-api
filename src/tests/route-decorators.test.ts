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

const handlerKey = Symbol("handler");

function decorateSymbolKey() {
  class SymbolController extends Controller("/symbol") {
    @Get()
    [handlerKey]() {
      return "ok";
    }
  }
  return SymbolController;
}

function decorateSymbolKeyWithLocation() {
  class SymbolLocationController extends Controller("/symbol-location") {
    @Get("explicit")
    [handlerKey]() {
      return "ok";
    }
  }
  return SymbolLocationController;
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

  it("refuse a symbol-keyed method without a location, which has no path segment", () => {
    assert.throws(decorateSymbolKey, {
      name: "TypeError",
      message:
        "Route decorators on a symbol-keyed method need a location; SymbolController[Symbol(handler)] has none",
    });
  });

  it("accept a symbol-keyed method given a location", () => {
    assert.doesNotThrow(decorateSymbolKeyWithLocation);
  });
});
