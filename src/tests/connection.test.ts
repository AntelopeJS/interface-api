import assert from "node:assert";
import type WebSocket from "ws";

import {
  Connection,
  Controller,
  Get,
  getRegisteredRouteHandlers,
  Monitor,
  Postfix,
  Prefix,
  UnregisterRoute,
  WebsocketHandler,
} from "../index";

const ROOT = "/connection-mode";

function handlersUnder(location: string) {
  return getRegisteredRouteHandlers().filter(({ handler }) =>
    handler.location.startsWith(location),
  );
}

describe("@Connection handler modes", () => {
  it("refuses a @Get handler and registers nothing", () => {
    assert.throws(
      () => {
        class Chat extends Controller(`${ROOT}/get`) {
          @Get("")
          plain(@Connection() connection: WebSocket) {
            return { connection };
          }
        }
        return Chat;
      },
      {
        name: "TypeError",
        message:
          "@Connection applies in websocket and monitor mode; parameter 0 of Chat.plain, declared on it or on a parent controller's method of that name, registers in handler mode",
      },
    );
    assert.deepEqual(handlersUnder(`${ROOT}/get`), []);
  });

  it("refuses @Prefix and @Postfix handlers, which never see a connection", () => {
    assert.throws(() => {
      class Before extends Controller(`${ROOT}/prefix`) {
        @Prefix("get", "")
        check(@Connection() connection: WebSocket) {
          return connection;
        }
      }
      return Before;
    }, /of Before\.check, .* registers in prefix mode/);
    assert.throws(() => {
      class After extends Controller(`${ROOT}/postfix`) {
        @Postfix("get", "")
        check(@Connection() connection: WebSocket) {
          return connection;
        }
      }
      return After;
    }, /of After\.check, .* registers in postfix mode/);
    assert.deepEqual(handlersUnder(`${ROOT}/prefix`), []);
    assert.deepEqual(handlersUnder(`${ROOT}/postfix`), []);
  });

  it("accepts a @Monitor handler, which runs after a WebSocket upgrade", () => {
    class Watch extends Controller(`${ROOT}/monitor`) {
      @Monitor("get", "")
      observe(@Connection() connection: WebSocket) {
        return connection;
      }
    }
    const registered = handlersUnder(`${ROOT}/monitor`);
    assert.deepEqual(
      registered.map(({ handler }) => [handler.mode, handler.controller.name]),
      [["monitor", Watch.name]],
    );
    registered.forEach(({ id }) => UnregisterRoute(Number(id)));
  });

  it("refuses @Connection after a default-valued parameter of a @Get handler", () => {
    assert.throws(() => {
      class Flagged extends Controller(`${ROOT}/flagged`) {
        @Get("")
        open(flag = false, @Connection() connection?: WebSocket) {
          return [flag, connection];
        }
      }
      return Flagged;
    }, /parameter 1 of Flagged\.open, .* registers in handler mode/);
    assert.deepEqual(handlersUnder(`${ROOT}/flagged`), []);
  });

  it("refuses a child @Get override that inherits the parent's @Connection", () => {
    class Room extends Controller(`${ROOT}/room`) {
      @WebsocketHandler("")
      open(@Connection() connection: WebSocket): number {
        return connection.readyState;
      }
    }
    assert.throws(() => {
      class Lobby extends Room.extend("lobby") {
        @Get("")
        override open() {
          return 0;
        }
      }
      return Lobby;
    }, /parameter 0 of Lobby\.open, declared on it or on a parent controller's method of that name, registers in handler mode/);
    const registered = handlersUnder(`${ROOT}/room`);
    assert.deepEqual(
      registered.map(({ handler }) => [handler.mode, handler.controller.name]),
      [["websocket", Room.name]],
    );
    registered.forEach(({ id }) => UnregisterRoute(Number(id)));
  });
});
