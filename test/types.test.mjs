// Checks that index.d.ts names the same members as the client, so the
// declarations don't fall behind src/rtma.js. Needs no web manager.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as rtma from "../index.js";

const dts = readFileSync(new URL("../index.d.ts", import.meta.url), "utf8");

// Members that are public in JavaScript but internal, so not declared.
const INTERNAL = new Set([
  "pending_ack",
  "connect_ack",
  "keepalive_timer",
  "error_handler",
  "msg_error_handler",
  "core_msg_handler",
]);

function declared_members(class_name) {
  const start = dts.indexOf(`export class ${class_name} {`);
  assert.notEqual(start, -1, `index.d.ts has no class ${class_name}`);
  const body = dts.slice(start, dts.indexOf("\n}\n", start));
  const names = new Set();
  for (const match of body.matchAll(/^ {2}(\w+)\??[(:]/gm)) {
    if (match[1] !== "constructor") names.add(match[1]);
  }
  return names;
}

test("index.d.ts declares the package's exports", () => {
  const declared = [...dts.matchAll(/^export class (\w+)/gm)].map((m) => m[1]);
  assert.deepEqual(new Set(declared), new Set(Object.keys(rtma)));
});

test("index.d.ts declares RTMAClient's public members", () => {
  const client = new rtma.RTMAClient();
  const actual = new Set(
    [
      ...Object.keys(client),
      ...Object.getOwnPropertyNames(rtma.RTMAClient.prototype),
    ].filter((n) => n !== "constructor" && !n.startsWith("_") && !INTERNAL.has(n))
  );
  assert.deepEqual(declared_members("RTMAClient"), actual);
});
