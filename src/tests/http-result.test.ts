import assert from "node:assert";
import sinon from "sinon";
import { createServer, ServerResponse } from "node:http";

import { HTTPResult as LocalHTTPResult } from "../index";
import { isString } from "../guards";
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

  it("Answers its body as a string, whatever body it was given", () => {
    const texts: string[] = [
      new LocalHTTPResult(200, "plain").getBody(),
      new LocalHTTPResult(200, { id: 1 }).getBody(),
      new LocalHTTPResult(200, null).getBody(),
      new LocalHTTPResult().getBody(),
    ];

    assert.deepEqual(texts, ["plain", '{"id":1}', "null", ""]);
  });

  it("Writes a body with a toJSON method through it", () => {
    const result = new LocalHTTPResult(200, {
      at: new Date(0),
      list: [1, "two", false, null],
    });

    assert.equal(
      result.getBody(),
      '{"at":"1970-01-01T00:00:00.000Z","list":[1,"two",false,null]}',
    );
  });

  it("Wraps a body with headers, or adds them to a result", () => {
    const wrapped = LocalHTTPResult.withHeaders(
      { ok: true },
      { "X-A": "a" },
      201,
    );
    const existing = new LocalHTTPResult(202, "text");

    assert.equal(wrapped.getStatus(), 201);
    assert.equal(wrapped.getBody(), '{"ok":true}');
    assert.equal(wrapped.getHeaders()["X-A"], "a");
    assert.strictEqual(
      LocalHTTPResult.withHeaders(existing, { "X-B": "b" }),
      existing,
    );
    assert.equal(existing.getHeaders()["X-B"], "b");
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

interface Received {
  status: number;
  contentLength: string | null;
  transferEncoding: string | null;
  body: string;
}

async function receive(
  result: LocalHTTPResult,
  prepare: (response: ServerResponse) => void = () => {},
): Promise<Received> {
  const server = createServer((_request, response) => {
    prepare(response);
    result.sendResponse(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert(address !== null && !isString(address), "Server listens on TCP");
    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    return {
      status: response.status,
      contentLength: response.headers.get("content-length"),
      transferEncoding: response.headers.get("transfer-encoding"),
      body: await response.text(),
    };
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

describe("HTTPResult body framing", () => {
  it("Frames a buffered body with its byte length", async () => {
    assert.deepEqual(await receive(new LocalHTTPResult(200, "héllo")), {
      status: 200,
      contentLength: "6",
      transferEncoding: null,
      body: "héllo",
    });
    assert.equal(
      (await receive(new LocalHTTPResult(201, { ok: true }))).contentLength,
      "11",
    );
    assert.equal((await receive(new LocalHTTPResult())).contentLength, "0");
  });

  it("Sends no Content-Length with a status that carries no body", async () => {
    for (const status of [204, 304, 204.5]) {
      const received = await receive(new LocalHTTPResult(status, null));
      assert.equal(received.status, Math.trunc(status));
      assert.equal(received.contentLength, null, String(status));
    }
  });

  it("Leaves the framing the result's headers set", async () => {
    const declared = await receive(
      LocalHTTPResult.withHeaders("body", { Trailer: "X-Checksum" }),
    );
    assert.equal(declared.transferEncoding, "chunked");
    assert.equal(declared.contentLength, null);
    assert.equal(declared.body, "body");
    const chunked = await receive(
      LocalHTTPResult.withHeaders("body", { "Transfer-Encoding": "chunked" }),
    );
    assert.equal(chunked.contentLength, null);
    const framed = await receive(
      LocalHTTPResult.withHeaders("body", { "content-length": "4" }),
    );
    assert.equal(framed.contentLength, "4");
  });

  it("Leaves the framing set on the raw response", async () => {
    for (const [name, value] of [
      ["Transfer-Encoding", "chunked"],
      ["Trailer", "X-Checksum"],
    ]) {
      const received = await receive(
        new LocalHTTPResult(200, "body"),
        (response) => response.setHeader(name, value),
      );
      assert.equal(received.transferEncoding, "chunked", name);
      assert.equal(received.contentLength, null, name);
      assert.equal(received.body, "body", name);
    }
  });

  it("Streams a response without a Content-Length", async () => {
    const result = new LocalHTTPResult();
    result.getWriteStream().end("streamed");

    const received = await receive(result);

    assert.equal(received.transferEncoding, "chunked");
    assert.equal(received.contentLength, null);
    assert.equal(received.body, "streamed");
  });
});
