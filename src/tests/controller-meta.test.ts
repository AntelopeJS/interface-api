import assert from "node:assert";

import { ControllerMeta } from "../index";
import { createRequestContext } from "./request-context";

const CONTROLLER = { location: "/meta" };

function providesOne(): number {
  return 1;
}

function returnsTwo(): number {
  return 2;
}

describe("ControllerMeta keys named like Object.prototype members", () => {
  it("registers a modifier on a property named toString", () => {
    const meta = new ControllerMeta(CONTROLLER);

    meta.addModifier("toString", undefined, returnsTwo);

    const { modifiers } = meta.getComputedParameter("toString", undefined);
    assert.deepStrictEqual(
      modifiers.map((modifier) => modifier(createRequestContext(), 0)),
      [2],
    );
  });

  it("keeps a provider on a property named valueOf to its controller", () => {
    const meta = new ControllerMeta(CONTROLLER);
    const other = new ControllerMeta(CONTROLLER);

    meta.setProvider("valueOf", undefined, providesOne);

    const { provider } = meta.getComputedParameter("valueOf", undefined);
    assert.strictEqual(provider?.(createRequestContext()), 1);
    assert.strictEqual(
      other.getComputedParameter("valueOf", undefined).provider,
      undefined,
    );
  });

  it("keeps the parameters of a handler named hasOwnProperty to its controller", () => {
    const meta = new ControllerMeta(CONTROLLER);
    const other = new ControllerMeta(CONTROLLER);

    meta.setProvider("hasOwnProperty", 0, providesOne);

    const parameters = meta.getParameterArray("hasOwnProperty");
    assert.deepStrictEqual(
      parameters.map((parameter) =>
        parameter?.provider?.(createRequestContext()),
      ),
      [1],
    );
    assert.deepStrictEqual(other.getParameterArray("hasOwnProperty"), [null]);
  });
});
