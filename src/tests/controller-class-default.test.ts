import assert from "node:assert";

import { Controller, type ControllerClass } from "../index";

type HasStringIndex<T> = string extends keyof T ? true : false;

const bareInstanceIsIndexable: HasStringIndex<InstanceType<ControllerClass>> =
  false;

describe("ControllerClass default instance type", () => {
  it("names no string index on a bare ControllerClass instance", () => {
    const bare: ControllerClass = Controller("/bare");

    assert.deepStrictEqual(Object.keys(new bare()), []);
    assert.strictEqual(bareInstanceIsIndexable, false);
  });
});
