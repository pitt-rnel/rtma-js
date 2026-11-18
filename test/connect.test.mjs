// Checks that RTMAClient calls on_disconnect once for each websocket,
// however the websocket reports its end. Needs no web manager.
import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { RTMAClient } from "../src/rtma.js";

const settle = (ms) => new Promise((res) => setTimeout(res, ms));

function watch(client) {
  const events = [];
  client.on_error = () => events.push("error");
  client.on_disconnect = () => events.push("disconnect");
  client.on_message = () => {};
  return events;
}

test("a failed connection calls on_error, then on_disconnect once", async () => {
  // Nothing listens on a port that was just free.
  const server = net.createServer();
  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  const { port } = server.address();
  await new Promise((res) => server.close(res));

  const client = new RTMAClient("127.0.0.1", port);
  const events = watch(client);
  client.connect();
  await settle(1000);

  assert.deepEqual(events, ["error", "disconnect"]);
});

// A WebSocket whose events the test fires, to give each order that a
// browser or Node can.
class FakeWebSocket {
  static instance = null;
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;
  constructor(url) {
    this.url = url;
    this.readyState = this.CONNECTING;
    this.sent = [];
    FakeWebSocket.instance = this;
  }
  send(text) {
    this.sent.push(text);
  }
  close() {
    this.readyState = this.CLOSED;
  }
  fire(type) {
    if (type === "open") this.readyState = this.OPEN;
    if (type === "close") this.readyState = this.CLOSED;
    this[`on${type}`]({ type, code: 1006 });
  }
}

const ORDERS = {
  "error only, as in Node 22": ["error"],
  "error then close, as in a browser": ["error", "close"],
  "open then close": ["open", "close"],
  "open, error, then close": ["open", "error", "close"],
};

for (const [name, order] of Object.entries(ORDERS)) {
  test(`one on_disconnect for ${name}`, () => {
    const real = globalThis.WebSocket;
    globalThis.WebSocket = FakeWebSocket;
    try {
      const client = new RTMAClient("127.0.0.1", 5678);
      const events = watch(client);
      client.connect();
      for (const type of order) FakeWebSocket.instance.fire(type);

      assert.equal(events.filter((e) => e === "disconnect").length, 1);
      assert.equal(events.at(-1), "disconnect");
      assert.equal(client.keepalive_timer, null);
    } finally {
      globalThis.WebSocket = real;
    }
  });
}

test("CONNECT_V2 carries Node's process ID and the module name", () => {
  const real = globalThis.WebSocket;
  globalThis.WebSocket = FakeWebSocket;
  try {
    const client = new RTMAClient("127.0.0.1", 5678, 0, 0, "pid_test");
    watch(client);
    client.connect();
    FakeWebSocket.instance.fire("open");
    const connect = JSON.parse(FakeWebSocket.instance.sent[0]);
    FakeWebSocket.instance.fire("close");

    assert.equal(connect.header.msg_type, 4);
    assert.equal(connect.data.pid, process.pid);
    assert.equal(connect.data.name, "pid_test");
  } finally {
    globalThis.WebSocket = real;
  }
});
