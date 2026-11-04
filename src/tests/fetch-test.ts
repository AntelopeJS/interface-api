import assert from "node:assert";
import sinon, { type SinonSpy } from "sinon";
import { MakeMethodDecorator } from "@antelopejs/interface-core/decorators";

const spies = new Map<unknown, Map<PropertyKey, SinonSpy>>();

export const SpyMethod = MakeMethodDecorator((target, key, descriptor) => {
  const spy = sinon.spy(descriptor.value);
  descriptor.value = spy;
  const controllerSpies = spies.get(target) ?? new Map<PropertyKey, SinonSpy>();
  controllerSpies.set(key, spy);
  spies.set(target, controllerSpies);
});

export function spyOf<T extends object>(
  controller: { prototype: T },
  key: keyof T & string,
): SinonSpy {
  const spy = spies.get(controller.prototype)?.get(key);
  assert(spy, `${key} is decorated with @SpyMethod`);
  return spy;
}

export const URL_BASE = "http://127.0.0.1:5010";

interface FetchTestOptions {
  route: string;
  status: number;
  method?: string;
  result?: string;
  callCount?: [SinonSpy, number];
  prepare?: (
    this: Mocha.Context,
    init: RequestInit,
    options: FetchTestOptions,
  ) => void | Promise<void>;
  postCheck?: (
    this: Mocha.Context,
    res: Response,
    options: FetchTestOptions,
  ) => void | Promise<void>;
}

export function FetchTest(name: string, options: FetchTestOptions) {
  it(`${name}: ${options.method ?? "GET"} ${options.route}`, async function () {
    const init: RequestInit = { method: options.method ?? "GET" };
    if (options.prepare) {
      await options.prepare.apply(this, [init, options]);
    }
    const res = await fetch(URL_BASE + options.route, init);
    if (res.status !== options.status) {
      throw new Error(
        `Wrong response status (expected ${options.status}, got ${res.status}): ${await res.text()}`,
      );
    }
    if (options.result !== undefined) {
      assert.equal(await res.text(), options.result, "Incorrect response body");
    }
    if (options.callCount) {
      sinon.assert.callCount(options.callCount[0], options.callCount[1]);
    }
    if (options.postCheck) {
      await options.postCheck.apply(this, [res, options]);
    }
  });
}
