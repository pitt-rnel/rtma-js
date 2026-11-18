# rtma-js

Javascript rtma/websocket client.

rtma-js 4 talks to the pyrtma 4 web manager. Earlier web managers are not supported.

1. Install the latest [pyrtma](https://github.com/pitt-rnel/pyrtma/):

    `pip install pyrtma`

2. Write message defs and list them in a `.defs` index file (see [pyrtma documentation](https://pyrtma.readthedocs.io/)), for example `message_defs.defs`:

    ```yaml
    index:
      message_defs: message_defs.yaml
    ```

    Build them for python and js:

    `python -m pyrtma.compile -i message_defs.defs --py --js`

    This writes `message_defs.py` and `message_defs.js` next to the index. The JavaScript file is an ES module that exports `RTMA`, which holds the message type IDs (`RTMA.MT`), a function for each message type that returns its data with every field set to zero (`RTMA.MDF`), and the constants (`RTMA.constants`). Its name comes from the index file, or from `-n NAME`.

3. Run Message Manager:

    `python -m pyrtma.manager`

4. Run Web Manager:

    `python -m pyrtma.web_manager -d message_defs.py`

5. Import `RTMAClient` and your definitions in your web app, as below.


## Installing as dependency
To install rtma-js as a npm package into your react project:
`npm install rtma-js`

## Install locally
1. Clone this repo

    `git clone https://github.com/pitt-rnel/rtma-js`

2. cd into your project directory

3. NPM install
   
   Use a relative or absolute path to this rtma-js repo, e.g.
   
   `npm install ../../rtma-js`

## Using RTMAClient

This connects to a web manager on this computer, subscribes to a message type, and replies to each message of that type. `message_defs.js` is the definitions file from step 2, with `EXAMPLE_MSG` and `EXAMPLE_MSG_REPLY` standing in for your message types. An application can also import its definitions from a package of its own, such as `climber_message`.

```js
import { RTMAClient } from "rtma-js";
import { RTMA } from "./message_defs.js";

const server = "127.0.0.1";
const port = 5678; // the web manager's port
const module_id = 0; // the web manager always assigns a dynamic ID
const host_id = 0;
const name = "my_web_app"; // optional, ASCII, up to 31 characters

const client = new RTMAClient(server, port, module_id, host_id, name);

// Set the handlers before connecting.
client.on_connect = () => {
    // Subscribe to an array of message types.
    client.subscribe([RTMA.MT.EXAMPLE_MSG]);
};

client.on_message = (msg) => {
    // msg.header holds the message header: msg_type, src_mod_id,
    // send_time, recv_time and the rest. msg.data holds the fields.
    if (msg.header.msg_type === RTMA.MT.EXAMPLE_MSG) {
        const reply = RTMA.MDF.EXAMPLE_MSG_REPLY();
        client.send_message(RTMA.MT.EXAMPLE_MSG_REPLY, reply);
    }
};

client.on_error = (error) => {
    // A websocket error, or {rtma_msg_error: "..."} from the web manager.
    console.error(error);
};

client.on_disconnect = () => {
    // Call client.connect() again here to reconnect.
};

client.connect();
```

`pause_subscription()` and `resume_subscription()` take an array of message types, like `subscribe()`. While a type is paused, the message manager doesn't send it, and the client lists it in `paused_types` instead of `subscribed_types`. `unsubscribe_from_all()`, `pause_all_subscriptions()` and `resume_all_subscriptions()` act on every subscribed or paused type. `send_module_ready()` sends MODULE_READY. The client puts Node's process ID, or 0 in a browser, in its CONNECT_V2 and MODULE_READY messages. The web manager replaces it with its own, since it holds the connection to the message manager.

The methods that send throw a `NotConnectedError`, exported with `RTMAClient`, when the client isn't connected: before `on_connect`, or after it disconnects. The `log_*` methods are the exception: they always write to the console, and send only while connected.

## Examples

`example/` has pages that use the definitions in `example/msg_defs`, with Python scripts in `example/scripts` to send them messages. To run one, from `example/`:

1. Start the message manager: `python -m pyrtma.manager`
2. Start the web manager: `python -m pyrtma.web_manager -d msg_defs/test_defs.py`, or use `run_web_manager_test_defs.bat`. The echo and trial_meta pages use `test_defs2.py` instead.
3. From the repository root, serve the pages: `python test_webserver.py`
4. Open a page, for example `http://localhost:8000/example/recv_time/index.html`, and run the matching script from `example/scripts`, here `python send_ping.py`.

| Page | Definitions | Script |
|---|---|---|
| `recv_time` | `test_defs` | `send_ping.py` |
| `plotting/raster.html` | `test_defs` | `send_raster.py` |
| `echo` | `test_defs2` | `send_all_messages.py` |
| `trial_meta` | `test_defs2` | `send_trial_meta.py` |

After changing the definitions, rebuild them with `build_msg_defs.bat`.

## Secure websockets

The `server` argument can be a host name or address, which connects with `ws://`, or a `ws://` or `wss://` URL, which can include a path. The `port` argument fills in the port unless the URL gives one. Pages loaded over https need `wss://`, since browsers block `ws://` from them.

The pyrtma web manager doesn't serve `wss://` itself, and the `key` and `cert` arguments of its `WebMessageManager` class don't work yet. Use a reverse proxy that handles TLS and passes plain websocket traffic to the web manager. With nginx, for example:

```nginx
location /rtma {
    proxy_pass http://127.0.0.1:5678;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

A page then connects with `new RTMAClient("wss://lab-pc/rtma", 443, 0, 0, "my_web_app")`. The browser must trust the proxy's certificate. For a self-signed certificate, opening the proxy's address in the browser once lets the user accept it.

## Running the tests

`npm test` needs Node 22 or later. The end-to-end test also needs Python with pyrtma installed, and is skipped without it. Set `PYTHON` to choose the Python, and `RTMA_MM` to test against another message manager, with `{port}` for its port, for example `RTMA_MM="MessageManager :{port}"`. The `wss://` test also makes a throwaway certificate with OpenSSL 1.1.1 or later, and is skipped without it. Set `OPENSSL` if `openssl` isn't on the path; Git for Windows includes one.

GitHub Actions runs `npm test` on Linux, with Node 22 and 24, for each push and pull request, without pyrtma, so the end-to-end tests skip themselves there. A second job runs the end-to-end tests with the pyrtma on PyPI. Since that may be older than the pyrtma that rtma-js is released with, a failure there shows as an error on the run but doesn't fail the check. Run the end-to-end tests locally with the pyrtma that rtma-js is released with.
