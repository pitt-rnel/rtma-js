"""Python side of e2e.test.mjs.

Usage: python peer.py MM_IP:PORT DEFS.py

Prints READY once it is subscribed. It sends the JS client's TEST_DOUBLE
back. When the JS client's STATUS arrives, it replies with TEST_PING, asks
the message manager for introductions, and prints what it saw as one line
of JSON.
"""

import json
import sys
import time

import pyrtma
import pyrtma.core_defs as cd

mm_ip, defs_file = sys.argv[1], sys.argv[2]
client = pyrtma.Client(
    name="py_peer", definitions=pyrtma.load_message_definitions(defs_file)
)
client.connect(mm_ip)
MT_STATUS = client.message_id_from_name("STATUS")
MT_TEST_PING = client.message_id_from_name("TEST_PING")
MT_TEST_DOUBLE = client.message_id_from_name("TEST_DOUBLE")
client.subscribe([MT_STATUS, MT_TEST_DOUBLE, cd.MT_HELLO])
print("READY", flush=True)

result = {}
deadline = time.perf_counter() + 10
while time.perf_counter() < deadline and "hello_name" not in result:
    msg = client.read_message(timeout=0.2)
    if msg is None:
        continue
    if msg.type_id == MT_TEST_DOUBLE and "double" not in result:
        # repr(), because JSON has no NaN
        result["double"] = [repr(msg.data.x), [repr(v) for v in msg.data.v]]
        result["double_label"] = msg.data.label
        client.send_message(msg.data)
    elif msg.type_id == MT_STATUS and "status_src" not in result:
        result["status_src"] = msg.header.src_mod_id
        result["status_bytes"] = msg.header.num_data_bytes
        result["status_msg"] = msg.data.msg
        ping = client.get_msg_cls(MT_TEST_PING)()
        ping.serial_no = 42
        client.send_message(ping)
        result["peer_mod_id"] = client.module_id
        client.send_signal(cd.MT_INTRODUCE)
    elif msg.type_id == cd.MT_HELLO and msg.data.mod_id == result.get("status_src"):
        result["hello_name"] = msg.data.name

client.disconnect()
print(json.dumps(result), flush=True)
