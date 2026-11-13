import assert from "node:assert";

import { getRegisteredRoutes, RegisterRoute, routesProxy } from "../index";

const proxyCalls = [];

describe("Route lifecycle, off-contract handlers", () => {
  before(() => {
    routesProxy.onRegister((id) => {
      proxyCalls.push({ kind: "register", id });
    }, true);
    routesProxy.onUnregister((id) => {
      proxyCalls.push({ kind: "unregister", id });
    });
  });

  beforeEach(() => {
    proxyCalls.length = 0;
  });

  it("refuses a handler that names no controller and registers nothing", () => {
    const handler = {
      location: "/lifecycle/no-controller",
      method: "GET",
      mode: "handler",
      parameters: [],
      properties: {},
      callback: async () => new Response(),
    };
    const before = getRegisteredRoutes().length;

    assert.throws(
      () => RegisterRoute(handler),
      (error) =>
        error instanceof TypeError &&
        error.message.includes("GET") &&
        error.message.includes("/lifecycle/no-controller") &&
        error.message.includes("controller"),
    );

    assert.equal(getRegisteredRoutes().length, before);
    assert.deepEqual(proxyCalls, []);
  });
});
