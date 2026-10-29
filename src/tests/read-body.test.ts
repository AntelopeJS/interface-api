import assert from "node:assert";
import { type IncomingMessage } from "node:http";

import {
  DEFAULT_REQUEST_BODY_LIMIT,
  HTTPResult as LocalHTTPResult,
  ReadBody,
} from "../index";
import { createBodyTestContext } from "./request-context";

function assertBodyListenersRemoved(request: IncomingMessage): void {
  assert.equal(request.listenerCount("data"), 0);
  assert.equal(request.listenerCount("end"), 0);
  assert.equal(request.listenerCount("error"), 0);
}

async function assertPayloadTooLarge(body: Promise<Buffer>): Promise<void> {
  await assert.rejects(body, (error) => {
    assert(error instanceof LocalHTTPResult);
    assert.equal(error.getStatus(), 413);
    assert.equal(error.getBody(), "Payload Too Large");
    return true;
  });
}

describe("ReadBody limits", () => {
  it("Accepts a normal body with the default limit", async () => {
    const test = createBodyTestContext();
    const body = ReadBody(test.context);
    test.request.push("normal body");
    test.request.push(null);

    assert.equal((await body).toString(), "normal body");
    assertBodyListenersRemoved(test.request);
  });

  it("Keeps the pending read in context.body for later readers", async () => {
    const test = createBodyTestContext();
    assert.equal(test.context.body, undefined);

    const body = ReadBody(test.context);
    test.request.push("shared");
    test.request.push(null);

    assert(test.context.body instanceof Promise);
    assert.equal((await test.context.body).toString(), "shared");
    assert.equal((await body).toString(), "shared");
    assert.equal((await ReadBody(test.context)).toString(), "shared");
  });

  it("Accepts a body exactly at the configured limit", async () => {
    const test = createBodyTestContext(4);
    const body = ReadBody(test.context, 4);
    test.request.push("test");
    test.request.push(null);

    assert.equal((await body).toString(), "test");
    assertBodyListenersRemoved(test.request);
  });

  it("Rejects an oversized Content-Length before adding listeners", async () => {
    const test = createBodyTestContext(DEFAULT_REQUEST_BODY_LIMIT + 1);

    await assertPayloadTooLarge(ReadBody(test.context));
    assert.equal(test.request.isPaused(), true);
    assertBodyListenersRemoved(test.request);
  });

  it("Rejects and stops an oversized chunked body", async () => {
    const test = createBodyTestContext();
    const body = ReadBody(test.context, 4);
    test.request.push("test");
    test.request.push("!");

    await assertPayloadTooLarge(body);
    assert.equal(test.request.isPaused(), true);
    assertBodyListenersRemoved(test.request);
  });

  it("Applies each limit across concurrent consumers", async () => {
    const test = createBodyTestContext(5);
    const permissiveBody = ReadBody(test.context, 8);
    const strictBody = ReadBody(test.context, 4);
    test.request.push("12345");
    test.request.push(null);

    assert.equal((await permissiveBody).toString(), "12345");
    await assertPayloadTooLarge(strictBody);
    assertBodyListenersRemoved(test.request);
  });

  it("Applies a stricter limit to an already cached body", async () => {
    const test = createBodyTestContext(5);
    const body = ReadBody(test.context, 8);
    test.request.push("12345");
    test.request.push(null);
    assert.equal((await body).toString(), "12345");

    await assertPayloadTooLarge(ReadBody(test.context, 4));
    assertBodyListenersRemoved(test.request);
  });

  it("Resumes for a permissive consumer after an earlier rejection", async () => {
    const test = createBodyTestContext();
    const strictBody = ReadBody(test.context, 4);
    test.request.push("12345");
    await assertPayloadTooLarge(strictBody);

    const body = ReadBody(test.context, 8);
    test.request.push(null);
    assert.equal((await body).toString(), "12345");
    assertBodyListenersRemoved(test.request);
  });
});
