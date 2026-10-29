import WebSocket from "ws";
import assert from "node:assert";
import sinon from "sinon";
import { Connection, Controller, WebsocketHandler } from "../index";

import { SpyMethod, URL_BASE } from "./fetch-test";

const testWSReceiver = sinon.spy();

let testWSSocket: WebSocket;

export class TestWebsocketController1 extends Controller(
  "/websocket/controller1",
) {
  @WebsocketHandler()
  @SpyMethod()
  test(@Connection() connection: WebSocket) {
    testWSSocket = connection;
    connection.on("message", testWSReceiver);
  }
}

describe("WebSocket", () => {
  let ws: WebSocket;
  const clientReceiver = sinon.spy();

  after(() => ws?.close());

  it("Connect", async () => {
    ws = new WebSocket(`${URL_BASE}/websocket/controller1/test`);
    ws.on("message", clientReceiver);
    await new Promise((resolve, reject) => {
      ws.on("open", resolve);
      ws.on("error", reject);
    });
    assert.equal(ws.readyState, WebSocket.OPEN, "Client connected");
  });

  it("Client -> Server", async () => {
    ws.send("Ok");
    await new Promise((resolve) => setTimeout(resolve, 10));
    sinon.assert.calledOnce(testWSReceiver);
    assert.equal(testWSReceiver.lastCall.firstArg.toString(), "Ok");
  });

  it("Client <- Server", async () => {
    testWSSocket.send("Ok");
    await new Promise((resolve) => setTimeout(resolve, 10));
    sinon.assert.calledOnce(clientReceiver);
    assert.equal(clientReceiver.lastCall.firstArg.toString(), "Ok");
  });

  it("Close", async () => {
    await new Promise((resolve) => {
      ws.on("close", resolve);
      testWSSocket.close();
    });
    assert.equal(
      ws.readyState,
      WebSocket.CLOSED,
      "Client saw the server close",
    );
  });
});
