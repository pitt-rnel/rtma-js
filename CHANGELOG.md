# Changelog

## 4.0.0 (unreleased)

rtma-js 4 is released with pyrtma 4 and needs the pyrtma 4 web manager. Message definitions must be rebuilt with the pyrtma 4 compiler, which takes a `.defs` index file; see the README.

### Added

- A `name` argument to the `RTMAClient` constructor, after `host_id`. The message manager shows it with the module ID, and the client's log messages carry it. It must be ASCII, up to 31 characters, or the constructor throws a `RangeError`.
- The `server` argument can be a `ws://` or `wss://` URL, with a path, for a TLS reverse proxy in front of the web manager. The `port` argument fills in a URL that has no port. The URL the client uses is in its `url` property.
- `pause_subscription()`, `resume_subscription()` and the `paused_types` set, `unsubscribe_from_all()`, `pause_all_subscriptions()` and `resume_all_subscriptions()`, which work as in pyrtma's Client.
- `send_module_ready()`, which sends MODULE_READY.
- `NotConnectedError`, exported with `RTMAClient`.
- NaN, Infinity and -Infinity in float and double fields, in both directions. pyrtma doesn't accept the infinities in its fields, so sending one gets an `rtma_msg_error`.
- Type declarations in `index.d.ts`, for editors and TypeScript. The code is still plain JavaScript.
- Tests: `npm test`, with Node 22 or later. The end-to-end tests need Python with pyrtma.

### Changed

- The client connects with CONNECT_V2 in place of CONNECT, so it needs the pyrtma 4 web manager.
- The methods that send throw `NotConnectedError` when the client isn't connected, which is before `on_connect` or after it disconnects. They used to fail with a `TypeError`, or reach the web manager and get an error back. The `log_*` methods still write to the console, and send only while connected.
- `send_time` and `recv_time` are both seconds since the epoch, with sub-millisecond resolution. `recv_time` used to be seconds since the page loaded, so the two couldn't be compared.
- The keepalive timer runs only while the websocket is open, so a Node process using the client can exit.
- The client sends Node's process ID, or 0 in a browser, in CONNECT_V2 and MODULE_READY. The web manager sends its own process ID to the message manager in its place.
- `package.json` has `"type": "module"`, and `index.js` imports `src/rtma.js` with its extension, so the package can be imported in Node.

### Fixed

- `subscribed_types` was always empty.
- A message from pyrtma with NaN in a double field was lost, because it isn't valid JSON, and the word "Infinity" in a string was changed to "1e1000".
- In Node, a connection that failed before it opened called `on_error` but never `on_disconnect`. Each websocket now gives one `on_disconnect`.

### Examples

- The example `PING` message is renamed `TEST_PING`, since pyrtma 4 defines `PING` in its core definitions.
- The definitions are built from `.defs` index files and rebuilt with pyrtma 4. `example/msg_defs/build_test_defs.bat` is removed, since `example/build_msg_defs.bat` builds both files.
- `TEST_DOUBLE` and `TEST_SIGNAL` are added to `test_defs`, for the tests.
- `send_all_messages.py` works with pyrtma 4.

## 1.0.1

The last release before 4.0.0.
