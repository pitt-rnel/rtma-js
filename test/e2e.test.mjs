// End-to-end test through the pyrtma web manager.
//
// Starts a message manager, the web manager and a Python peer (peer.py),
// then checks that RTMAClient connects, subscribes, and sends and receives
// messages. Skipped when pyrtma can't be imported.
//
// Environment:
//   PYTHON   Python with pyrtma installed. Defaults to python3, or python on
//            Windows.
//   RTMA_MM  Command that starts the message manager instead of the pyrtma
//            one, with {port} for its port, for example
//            "MessageManager :{port}". It is split on whitespace.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { RTMAClient } from "../src/rtma.js";
import { RTMA } from "../example/msg_defs/test_defs.js";

const PYTHON =
  process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const DEFS = fileURLToPath(
  new URL("../example/msg_defs/test_defs.py", import.meta.url)
);
const PEER = fileURLToPath(new URL("./peer.py", import.meta.url));
const NAME = "rtma_js_test";

const check = spawnSync(PYTHON, ["-c", "import pyrtma"]);
const skip =
  check.status === 0 ? false : `pyrtma can't be imported with "${PYTHON}"`;

const children = [];

after(() => {
  for (const child of children) {
    child.kill();
  }
});

function start(label, cmd, args) {
  const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
  child.output = "";
  const collect = (data) => (child.output += data);
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  child.on("error", (e) => (child.output += `${label} failed to start: ${e}`));
  child.label = label;
  children.push(child);
  return child;
}

function output() {
  return children.map((c) => `--- ${c.label}\n${c.output}`).join("\n");
}

async function free_port() {
  const server = net.createServer();
  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  const { port } = server.address();
  await new Promise((res) => server.close(res));
  return port;
}

async function wait_for_port(port, timeout_ms = 10000) {
  const deadline = Date.now() + timeout_ms;
  while (Date.now() < deadline) {
    const ok = await new Promise((res) => {
      const sock = net.connect(port, "127.0.0.1");
      sock.on("connect", () => {
        sock.destroy();
        res(true);
      });
      sock.on("error", () => res(false));
    });
    if (ok) return;
    await new Promise((res) => setTimeout(res, 100));
  }
  throw new Error(`Nothing listening on port ${port}\n${output()}`);
}

function wait_for(promise, what, timeout_ms = 10000) {
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(
      () => rej(new Error(`Timed out waiting for ${what}\n${output()}`)),
      timeout_ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function start_manager(port) {
  if (process.env.RTMA_MM) {
    const [cmd, ...args] = process.env.RTMA_MM.replaceAll("{port}", port)
      .trim()
      .split(/\s+/);
    return start("message manager", cmd, args);
  }
  return start("message manager", PYTHON, ["-m", "pyrtma.manager", "-p", port]);
}

test(
  "RTMAClient through the web manager",
  { skip, timeout: 60000 },
  async () => {
    const mm_port = await free_port();
    start_manager(String(mm_port));
    await wait_for_port(mm_port);

    const ws_port = await free_port();
    start("web manager", PYTHON, [
      "-m",
      "pyrtma.web_manager",
      "-m",
      `127.0.0.1:${mm_port}`,
      "-p",
      String(ws_port),
      "-d",
      DEFS,
    ]);
    await wait_for_port(ws_port);

    const peer = start("peer", PYTHON, [PEER, `127.0.0.1:${mm_port}`, DEFS]);
    await wait_for(
      new Promise((res) => {
        peer.stdout.on("data", () => {
          if (peer.output.includes("READY")) res();
        });
      }),
      "the peer to subscribe"
    );
    const peer_done = new Promise((res) => peer.on("exit", res));

    const client = new RTMAClient("127.0.0.1", ws_port, 0, 0, NAME);
    const errors = [];
    client.on_error = (e) =>
      errors.push(e.rtma_msg_error ?? (e.message || e.error?.message || e.type));

    const connected = new Promise((res) => (client.on_connect = res));
    // Every message received, and the waits for ones not yet received.
    const received = [];
    let waiting = [];
    client.on_message = (msg) => {
      received.push(msg);
      waiting = waiting.filter((w) => !(w.check(msg) && (w.res(msg), true)));
    };
    const wait_message = (what, check) => {
      const found = received.find(check);
      if (found) return Promise.resolve(found);
      return wait_for(new Promise((res) => waiting.push({ check, res })), what);
    };
    // The client also gets the TEST_DOUBLE it sends. These check the source.
    const from_peer = (type, check) => (m) =>
      m.header.msg_type === type &&
      m.header.src_mod_id !== client.module_id &&
      check(m.data);
    const ping = (serial_no) =>
      from_peer(RTMA.MT.TEST_PING, (d) => d.serial_no === serial_no);
    const send_status = (text) => {
      const status = RTMA.MDF.STATUS();
      status.msg = text;
      status.msg_length = text.length;
      client.send_message(RTMA.MT.STATUS, status);
    };
    client.connect();
    await wait_for(connected, "the connection ACK");
    let close_info = "none";
    client.ws.addEventListener("close", (e) => {
      close_info = `code ${e.code}, wasClean ${e.wasClean}`;
    });
    assert.ok(client.module_id >= 10000, `module ID ${client.module_id}`);

    const types = [RTMA.MT.TEST_PING, RTMA.MT.TEST_DOUBLE];
    client.subscribe(types);
    assert.deepEqual([...client.subscribed_types], types);
    client.send_module_ready();

    // NaN has no JSON form, so this checks that it gets to Python and back.
    const double = { x: NaN, v: [NaN, -1.5, 2.5], label: "NaN Infinity" };
    client.send_message(RTMA.MT.TEST_DOUBLE, double);

    send_status("subscribed");

    const echo = await wait_message(
      "TEST_DOUBLE from the peer",
      from_peer(RTMA.MT.TEST_DOUBLE, (d) => d.label === double.label)
    );
    assert.deepStrictEqual(echo.data, double);
    const ping_42 = await wait_message("TEST_PING 42", ping(42));

    // The peer sends TEST_PING 43 and then the marker, so if the pause
    // didn't hold, 43 arrives before the marker.
    client.pause_subscription([RTMA.MT.TEST_PING]);
    assert.deepEqual([...client.subscribed_types], [RTMA.MT.TEST_DOUBLE]);
    assert.deepEqual([...client.paused_types], [RTMA.MT.TEST_PING]);
    send_status("paused");
    await wait_message(
      "the peer's marker",
      from_peer(RTMA.MT.TEST_DOUBLE, (d) => d.label === "marker")
    );
    assert.equal(received.find(ping(43)), undefined);

    client.resume_subscription([RTMA.MT.TEST_PING]);
    assert.deepEqual(
      new Set(client.subscribed_types),
      new Set([RTMA.MT.TEST_PING, RTMA.MT.TEST_DOUBLE])
    );
    assert.deepEqual([...client.paused_types], []);
    send_status("resumed");
    await wait_message("TEST_PING 44", ping(44));

    await wait_for(peer_done, "the peer to finish");
    const seen = JSON.parse(peer.output.trim().split("\n").pop());
    assert.equal(ping_42.header.src_mod_id, seen.peer_mod_id);
    assert.equal(seen.status_src, client.module_id);
    assert.equal(seen.status_bytes, 1028);
    assert.equal(seen.status_msg, "subscribed");
    assert.equal(seen.hello_name, NAME);
    assert.deepEqual(seen.double, ["nan", ["nan", "-1.5", "2.5"]]);
    assert.equal(seen.double_label, "NaN Infinity");
    // HELLOs for the client's CONNECT_V2, MODULE_READY and the peer's
    // INTRODUCE, each with the web manager's process ID, not Node's.
    const pids = seen.hello_pids[client.module_id];
    assert.equal(pids.length, 3, `HELLO pids ${pids}`);
    assert.equal(new Set(pids).size, 1, `HELLO pids ${pids}`);
    assert.notEqual(pids[0], process.pid);

    client.unsubscribe(types);
    assert.deepEqual([...client.subscribed_types], []);

    const closed = new Promise((res) => (client.on_disconnect = res));
    client.disconnect();
    await wait_for(closed, "the websocket to close");
    assert.equal(client.keepalive_timer, null);
    assert.equal(close_info, "code 1000, wasClean true");
    assert.deepEqual(errors, [], `websocket close: ${close_info}`);
  }
);
