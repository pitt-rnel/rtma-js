// Checks the websocket URL that RTMAClient builds from its server and port.
// Needs no web manager: the client doesn't connect.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RTMAClient } from "../src/rtma.js";

const URLS = [
  ["127.0.0.1", 5678, "ws://127.0.0.1:5678/"],
  ["lab-pc", 5678, "ws://lab-pc:5678/"],
  ["lab-pc:9000", 5678, "ws://lab-pc:9000/"],
  ["[::1]", 5678, "ws://[::1]:5678/"],
  ["wss://lab-pc", 5678, "wss://lab-pc:5678/"],
  ["wss://lab-pc/rtma", 443, "wss://lab-pc/rtma"],
  ["wss://lab-pc:9000/rtma", 5678, "wss://lab-pc:9000/rtma"],
  ["wss://lab-pc:443/rtma?x=1", 5678, "wss://lab-pc/rtma?x=1"],
  ["ws://lab-pc:80", 5678, "ws://lab-pc/"],
];

for (const [server, port, url] of URLS) {
  test(`server "${server}" with port ${port} is ${url}`, () => {
    assert.equal(new RTMAClient(server, port).url, url);
  });
}

for (const server of ["http://lab-pc", "wss://lab-pc/#x", "::1", "ws://"]) {
  test(`server "${server}" throws a RangeError`, () => {
    assert.throws(() => new RTMAClient(server, 5678), RangeError);
  });
}
