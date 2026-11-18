// The client side of the wss:// test in e2e.test.mjs, which runs it in a
// child process so that NODE_EXTRA_CA_CERTS can make it trust the test
// certificate.
//
// Usage: node wss_client.mjs SERVER PORT
//
// Connects, sends a STATUS to itself, disconnects, and prints what happened
// as one line of JSON.
import { RTMAClient } from "../src/rtma.js";
import { RTMA } from "../example/msg_defs/test_defs.js";

const [server, port] = process.argv.slice(2);
const result = { connected: false, errors: [] };
const client = new RTMAClient(server, Number(port), 0, 0, "wss_test");
result.url = client.url;

const finish = () => {
  console.log(JSON.stringify(result));
  process.exit(0);
};

client.on_error = (e) => {
  result.errors.push(e.rtma_msg_error ?? (e.message || e.error?.message || e.type));
  // When the connection fails, Node 22's WebSocket fires error but never
  // close, so on_disconnect doesn't come.
  if (!client.connected) setTimeout(finish, 100);
};
client.on_connect = () => {
  result.connected = true;
  result.module_id = client.module_id;
  client.subscribe([RTMA.MT.STATUS]);
  const status = RTMA.MDF.STATUS();
  status.msg = "over tls";
  status.msg_length = status.msg.length;
  client.send_message(RTMA.MT.STATUS, status);
};
client.on_message = (msg) => {
  if (msg.header.msg_type === RTMA.MT.STATUS) {
    result.status = msg.data.msg;
    client.disconnect();
  }
};
client.on_disconnect = finish;
setTimeout(finish, 10000);
client.connect();
