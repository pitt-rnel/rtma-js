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

## Running the tests

`npm test` needs Node 22 or later. The end-to-end test also needs Python with pyrtma installed, and is skipped without it. Set `PYTHON` to choose the Python, and `RTMA_MM` to test against another message manager, with `{port}` for its port, for example `RTMA_MM="MessageManager :{port}"`.
