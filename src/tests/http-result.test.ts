import assert from "node:assert";
import sinon from "sinon";
import { ServerResponse } from "node:http";

import { HTTPResult as LocalHTTPResult } from "../index";
import { createRequest } from "./request-context";

function createCapturedResponse() {
  const response = new ServerResponse(createRequest());
  return {
    response,
    writeHead: sinon.spy(response, "writeHead"),
    end: sinon.spy(response, "end"),
  };
}

describe("HTTPResult response contract", () => {
  it("Serializes object bodies immediately", () => {
    const body = { message: "before" };
    const result = new LocalHTTPResult(200, body);

    body.message = "after";

    assert.equal(result.getBody(), '{"message":"before"}');
    assert.equal(result.getContentType(), "application/json");
  });

  it("Peeks at headers without creating the mutable store", () => {
    const result = new LocalHTTPResult();

    assert.equal(result.peekHeaders(), undefined);

    result.addHeader("X-Added", "yes");
    assert.equal(result.peekHeaders()?.["X-Added"], "yes");

    const headers = result.getHeaders();
    assert.strictEqual(result.peekHeaders(), headers);
    headers["X-Mutable"] = "yes";
    assert.equal(result.peekHeaders()?.["X-Mutable"], "yes");
  });

  it("Sends the current own headers, content type, status, and body", () => {
    const result = new LocalHTTPResult(202, { ok: true });
    const headers = result.getHeaders();
    Object.setPrototypeOf(headers, { "X-Inherited": "excluded" });
    headers["X-Current"] = "current";
    result.addHeader("Content-Type", "text/html");
    const captured = createCapturedResponse();

    result.sendResponse(captured.response);

    const sent = captured.writeHead.firstCall.args[1];
    assert(sent !== undefined && !Array.isArray(sent), "Headers object sent");
    assert.equal(captured.response.statusCode, 202);
    assert.equal(captured.end.firstCall.args[0], '{"ok":true}');
    assert.equal(sent["X-Current"], "current");
    assert.equal(sent["X-Inherited"], undefined);
    assert.equal(sent["Content-Type"], "application/json");
  });

  it("Sends HEAD without a body and closes an attached stream", () => {
    const result = new LocalHTTPResult(204, { ignored: true });
    const stream = result.getWriteStream("text/event-stream", 206);
    const captured = createCapturedResponse();

    result.sendHeadResponse(captured.response);

    const sent = captured.writeHead.firstCall.args[1];
    assert(sent !== undefined && !Array.isArray(sent), "Headers object sent");
    assert.equal(captured.response.statusCode, 206);
    assert.equal(captured.end.firstCall.args[0], undefined);
    assert.equal(sent["Content-Type"], "text/event-stream");
    assert.equal(captured.response.writableEnded, true);
    assert.equal(stream.writableEnded, true);
  });

  it("Ends an aborted stream response without piping", () => {
    const result = new LocalHTTPResult();
    result.getWriteStream();
    const captured = createCapturedResponse();

    result.sendResponse(captured.response, true);

    assert.equal(captured.response.statusCode, 200);
    assert.equal(captured.end.firstCall.args[0], "");
    assert.equal(captured.response.writableEnded, true);
  });
});
