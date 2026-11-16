// Checks the committed example message definitions. Needs no Python.
import { test } from "node:test";
import assert from "node:assert/strict";

const DEFS = ["test_defs.js", "test_defs2.js"];

for (const file of DEFS) {
  test(`${file} was compiled by pyrtma 4 and its constructors work`, async () => {
    const { RTMA } = await import(`../example/msg_defs/${file}`);
    assert.match(RTMA.COMPILED_PYRTMA_VERSION, /^4\./);

    const failed = [];
    for (const group of ["SDF", "MDF"]) {
      for (const [name, ctor] of Object.entries(RTMA[group])) {
        try {
          ctor();
        } catch (e) {
          failed.push(`${group}.${name}: ${e.message}`);
        }
      }
    }
    assert.deepEqual(failed, []);
  });
}
