"""Python side of e2e.test.mjs.

Usage: python peer.py MM_IP:PORT DEFS.py

Prints READY once it is subscribed. It sends the JS client's TEST_DOUBLE
back, answers TEST_SIGNAL with TEST_PING 45, records RTMA_LOG_INFO
messages, and answers each of the JS client's STATUS messages:

- "subscribed": TEST_PING 42, and a request for introductions.
- "paused": TEST_PING 43, then a TEST_DOUBLE labelled "marker".
- "resumed": TEST_PING 44.

After "resumed" it prints what it saw as one line of JSON, including the
process ID in each HELLO, by module ID.
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
MT_TEST_SIGNAL = client.message_id_from_name("TEST_SIGNAL")
client.subscribe(
    [MT_STATUS, MT_TEST_DOUBLE, MT_TEST_SIGNAL, cd.MT_HELLO, cd.MT_RTMA_LOG_INFO]
)
print("READY", flush=True)


def send_ping(serial_no: int) -> None:
    ping = client.get_msg_cls(MT_TEST_PING)()
    ping.serial_no = serial_no
    client.send_message(ping)


result: dict = {"hello_pids": {}, "logs": []}
deadline = time.perf_counter() + 15
while time.perf_counter() < deadline and not (
    "resumed" in result and "hello_name" in result
):
    msg = client.read_message(timeout=0.2)
    if msg is None:
        continue
    if msg.type_id == cd.MT_HELLO:
        result["hello_pids"].setdefault(str(msg.data.mod_id), []).append(msg.data.pid)
        if msg.data.mod_id == result.get("status_src"):
            result["hello_name"] = msg.data.name
    elif msg.type_id == cd.MT_RTMA_LOG_INFO:
        data = msg.data
        result["logs"].append(
            [msg.header.src_mod_id, data.name, data.message, data.level]
        )
    elif msg.type_id == MT_TEST_SIGNAL:
        result["signal"] = {
            "src": msg.header.src_mod_id,
            "dest": msg.header.dest_mod_id,
            "bytes": msg.header.num_data_bytes,
        }
        send_ping(45)
    elif msg.type_id == MT_TEST_DOUBLE and "double" not in result:
        # repr(), because JSON has no NaN
        result["double"] = [repr(msg.data.x), [repr(v) for v in msg.data.v]]
        result["double_label"] = msg.data.label
        client.send_message(msg.data)
    elif msg.type_id == MT_STATUS and msg.data.msg == "subscribed":
        result["status_src"] = msg.header.src_mod_id
        result["status_bytes"] = msg.header.num_data_bytes
        result["status_msg"] = msg.data.msg
        send_ping(42)
        result["peer_mod_id"] = client.module_id
        client.send_signal(cd.MT_INTRODUCE)
    elif msg.type_id == MT_STATUS and msg.data.msg == "paused":
        send_ping(43)
        marker = client.get_msg_cls(MT_TEST_DOUBLE)()
        marker.label = "marker"
        client.send_message(marker)
    elif msg.type_id == MT_STATUS and msg.data.msg == "resumed":
        send_ping(44)
        result["resumed"] = True

client.disconnect()
print(json.dumps(result), flush=True)
