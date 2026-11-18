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

3. Run Message Manager:

    `python -m pyrtma.manager`

4. Run Web Manager:

    `python -m pyrtma.web_manager -d message_defs.py`

5. Import and call rtma-js client from your javascript web app


## Installing as dependency
To install rtma-js as a npm package into your react project:
`npm install rtma-js`

## Install locally
1. Clone this repo

    `git clone github.com/pitt-rnel/rtma-js`

2. cd into your project directory

3. NPM install
   
   Use a relative or absolute path to this rtma-js repo, e.g.
   
   `npm install ../../rtma-js`

## Using RTMAClient

```js
 import { RTMA } from "climber_message";
 import { RTMAClient } from "rtma-js";

 export default function Main() {    
     const server = "127.0.0.1";
     const port = 5678;
     const module_id = 0; // the web manager always assigns a dynamic ID
     const host_id = 0;
     const name = "my_web_app"; // optional, ASCII, up to 31 characters

     const client = new RTMAClient(server, port, module_id, host_id, name);

     //install handlers before connecting
     client.on_connect = () => {
         // subscribe to an array of RTMA messages
         client.subscribe([RTMA.MT.EXAMPLE_MSG]);
     }

     client.on_message = (msg) => {
         // your logic here
         if (msg.header.msg_type === RTMA.MT.EXAMPLE_MSG){
             const data = msg.data;
             const reply_msg = RTMA.MDF.EXAMPLE_MSG_REPLY();
             client.send_message(RTMA.MT.EXAMPLE_MSG_REPLY, reply_msg);
         }
     }

     client.connect();

 }      
```

`pause_subscription()` and `resume_subscription()` take an array of message types, like `subscribe()`. While a type is paused, the message manager doesn't send it, and the client lists it in `paused_types` instead of `subscribed_types`. `unsubscribe_from_all()`, `pause_all_subscriptions()` and `resume_all_subscriptions()` act on every subscribed or paused type. `send_module_ready()` sends MODULE_READY. The web manager replaces the process ID in it with its own, since it holds the connection to the message manager.

The methods that send throw a `NotConnectedError`, exported with `RTMAClient`, when the client isn't connected: before `on_connect`, or after it disconnects. The `log_*` methods are the exception: they always write to the console, and send only while connected.

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
