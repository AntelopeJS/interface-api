import assert from "node:assert";
import sinon from "sinon";
import { Logging } from "@antelopejs/interface-core/logging";
import { Socket } from "node:net";
import { IncomingMessage, ServerResponse } from "node:http";
import logListener, {
  type Log,
} from "@antelopejs/interface-core/logging/listener";

import { HTTPResult as LocalHTTPResult } from "../index";

const BODY_LOG_LIMIT = 2048;

function createResponseStub(): ServerResponse {
  const request = new IncomingMessage(new Socket());
  request.method = "GET";
  request.url = "/boom";
  return new ServerResponse(request);
}

describe("HTTPResult error logging", () => {
  const logs: Log[] = [];
  const captureLog = (log: Log) => logs.push(log);
  const errorLogs = () =>
    logs.filter((log) => log.levelId === Logging.Level.ERROR);

  beforeEach(() => {
    logs.length = 0;
    logListener.register(captureLog);
  });

  afterEach(() => {
    logListener.unregister(captureLog);
  });

  it("Does not write the body to the console on status 500", () => {
    const consoleError = sinon.stub(console, "error");
    try {
      const result = new LocalHTTPResult(500, { error: "Internal" });
      result.setStatus(500);
      sinon.assert.notCalled(consoleError);
    } finally {
      consoleError.restore();
    }
  });

  it("Logs a 500 with request context once at send time", () => {
    const result = new LocalHTTPResult(500, { error: "Internal" });
    result.sendResponse(createResponseStub());
    assert.equal(errorLogs().length, 1);
    assert.equal(
      errorLogs()[0].args[0],
      'HTTP 500 GET /boom: {"error":"Internal"}',
    );
  });

  it("Logs a 500 when sendHeadResponse is the first sender", () => {
    const result = new LocalHTTPResult(500, { error: "Internal" });
    result.sendHeadResponse(createResponseStub());
    assert.equal(errorLogs().length, 1);
    assert.equal(
      errorLogs()[0].args[0],
      'HTTP 500 GET /boom: {"error":"Internal"}',
    );
  });

  it("Does not log a second time on repeated sends", () => {
    const result = new LocalHTTPResult(500, { error: "Internal" });
    result.sendResponse(createResponseStub());
    result.sendResponse(createResponseStub());
    result.sendHeadResponse(createResponseStub());
    assert.equal(errorLogs().length, 1);
  });

  it("Does not log non-500 responses", () => {
    const result = new LocalHTTPResult(200, "ok");
    result.sendResponse(createResponseStub());
    result.sendHeadResponse(createResponseStub());
    assert.equal(errorLogs().length, 0);
  });

  it("Truncates 500 bodies longer than the log limit", () => {
    const result = new LocalHTTPResult(500, "x".repeat(BODY_LOG_LIMIT + 100));
    result.sendResponse(createResponseStub());
    assert.equal(errorLogs().length, 1);
    assert.equal(
      errorLogs()[0].args[0],
      `HTTP 500 GET /boom: ${"x".repeat(BODY_LOG_LIMIT)}... [truncated]`,
    );
  });
});
