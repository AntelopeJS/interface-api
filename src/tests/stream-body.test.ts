import assert from "node:assert";

import { DEFAULT_REQUEST_BODY_LIMIT, StreamBody } from "../index";
import { createBodyTestContext } from "./request-context";

describe("StreamBody", () => {
  it("Yields the body chunks as they arrive", async () => {
    const test = createBodyTestContext();
    const chunks: string[] = [];
    const reading = (async () => {
      for await (const chunk of StreamBody(test.context))
        chunks.push(Buffer.from(chunk).toString());
    })();
    test.request.push("ab");
    test.request.push("c");
    test.request.push(null);
    await reading;
    assert.equal(chunks.join(""), "abc");
  });

  it("Applies no buffered limit", async () => {
    const size = DEFAULT_REQUEST_BODY_LIMIT + 1;
    const test = createBodyTestContext(size);
    let received = 0;
    const reading = (async () => {
      for await (const chunk of StreamBody(test.context))
        received += chunk.byteLength;
    })();
    test.request.push(Buffer.alloc(size));
    test.request.push(null);
    await reading;
    assert.equal(received, size);
  });

  it("Discards the rest of the body when the reader stops early", async () => {
    const test = createBodyTestContext();
    test.request.push("first");
    for await (const _chunk of StreamBody(test.context)) break;
    const drained = new Promise((resolve) => test.request.once("end", resolve));
    test.request.push("rest");
    test.request.push(null);
    await drained;
    assert.equal(
      test.request.readableEnded,
      true,
      "A destroyed request never ends: reaching end shows the rest was read",
    );
  });
});
