// The core message types and definitions that this client uses. They match
// pyrtma v4's core_defs/rtma_core.yaml. Applications get the full set of core
// definitions from their own message definitions, compiled by pyrtma.
const CORE = {
  MT: {
    EXIT: 0,
    ACKNOWLEDGE: 2,
    CONNECT_V2: 4,
    DISCONNECT: 14,
    SUBSCRIBE: 15,
    UNSUBSCRIBE: 16,
    MODULE_READY: 26,
    RTMA_LOG: 40,
    RTMA_LOG_CRITICAL: 41,
    RTMA_LOG_ERROR: 42,
    RTMA_LOG_WARNING: 43,
    RTMA_LOG_INFO: 44,
    RTMA_LOG_DEBUG: 45,
    PAUSE_SUBSCRIPTION: 85,
    RESUME_SUBSCRIPTION: 86,
  },

  MDF: {
    RTMA_MSG_HEADER: () => {
      return {
        msg_type: 0,
        msg_count: 0,
        send_time: 0,
        recv_time: 0,
        src_host_id: 0,
        src_mod_id: 0,
        dest_host_id: 0,
        dest_mod_id: 0,
        num_data_bytes: 0,
        remaining_bytes: 0,
        is_dynamic: 0,
        reserved: 0,
      };
    },

    CONNECT_V2: () => {
      return {
        logger_status: 0,
        reserved: 0,
        reserved1: 0,
        mod_id: 0,
        pid: 0,
        name: "",
      };
    },

    SUBSCRIBE: () => {
      return {
        msg_type: 0,
      };
    },

    UNSUBSCRIBE: () => {
      return {
        msg_type: 0,
      };
    },

    PAUSE_SUBSCRIPTION: () => {
      return {
        msg_type: 0,
      };
    },

    RESUME_SUBSCRIPTION: () => {
      return {
        msg_type: 0,
      };
    },

    MODULE_READY: () => {
      return {
        pid: 0,
      };
    },

    RTMA_LOG: () => {
      return {
        time: 0,
        level: 0,
        lineno: 0,
        name: "", 
        pathname: "",
        funcname: "",
        message: "",
      };
    },

    RTMA_LOG_CRITICAL: () => {
      return {
        time: 0,
        level: 0,
        lineno: 0,
        name: "", 
        pathname: "",
        funcname: "",
        message: "",
      };
    },

    RTMA_LOG_ERROR: () => {
      return {
        time: 0,
        level: 0,
        lineno: 0,
        name: "", 
        pathname: "",
        funcname: "",
        message: "",
      };
    },

    RTMA_LOG_WARNING: () => {
      return {
        time: 0,
        level: 0,
        lineno: 0,
        name: "", 
        pathname: "",
        funcname: "",
        message: "",
      };
    },

    RTMA_LOG_INFO: () => {
      return {
        time: 0,
        level: 0,
        lineno: 0,
        name: "", 
        pathname: "",
        funcname: "",
        message: "",
      };
    },

    RTMA_LOG_DEBUG: () => {
      return {
        time: 0,
        level: 0,
        lineno: 0,
        name: "", 
        pathname: "",
        funcname: "",
        message: "",
      };
    },
  },
};

// The current time in seconds since the Unix epoch, with sub-millisecond
// resolution. Used for both send_time and recv_time, so the two compare.
function now_seconds() {
  return (performance.timeOrigin + performance.now()) / 1000;
}

// pyrtma writes NaN, Infinity and -Infinity as bare tokens, which JSON
// doesn't allow. A marker string carries each one through JSON instead: a NUL
// followed by the token. pyrtma strings end at their first NUL, so no string
// from pyrtma can look like a marker.
const NONFINITE_TOKENS = /"(?:[^"\\]|\\.)*"|-?Infinity|NaN/g;
const NONFINITE_MARKERS = /"\\u0000(NaN|-?Infinity)"/g;

function parse_json(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
  }
  // Mark the tokens outside strings, then turn the markers into numbers.
  const marked = text.replace(NONFINITE_TOKENS, (m) =>
    m[0] === '"' ? m : `"\\u0000${m}"`
  );
  const msg = JSON.parse(marked);
  unmark(msg);
  return msg;
}

function unmark(obj) {
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "string") {
      if (value.charCodeAt(0) === 0) obj[key] = Number(value.slice(1));
    } else if (value !== null && typeof value === "object") {
      unmark(value);
    }
  }
}

function to_json(value) {
  // JSON.stringify writes non-finite numbers as null, so only a message with
  // null in it needs the slower pass that marks them.
  const text = JSON.stringify(value);
  if (!text.includes("null")) return text;
  return JSON.stringify(value, (key, v) =>
    typeof v === "number" && !Number.isFinite(v) ? `\u0000${v}` : v
  ).replace(NONFINITE_MARKERS, "$1");
}

// CONNECT_V2 carries the name as ASCII in char[MAX_NAME_LEN] (32), which
// includes the terminating null.
const MAX_NAME_CHARS = 31;

// The websocket URL for a server and port. The server is a host name or
// address, which gets ws://, or a ws:// or wss:// URL, which may have a path
// for a reverse proxy. The port fills in a URL that doesn't give one.
function websocket_url(server, port) {
  const text = server.includes("://") ? server : `ws://${server}`;
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new RangeError(`rtma.js: server "${server}" isn't a host or URL`);
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new RangeError(
      `rtma.js: server "${server}" must use ws:// or wss://`
    );
  }
  if (text.includes("#")) {
    throw new RangeError(`rtma.js: server "${server}" can't have a #fragment`);
  }
  // URL drops a default port, such as 443 for wss://, so look for a port in
  // the text itself. IPv6 addresses are in brackets, so a port follows "]".
  const authority = text.split("://")[1].split(/[/?#]/)[0];
  if (!/:\d+$/.test(authority)) {
    url.port = String(port);
  }
  return url.href;
}

// This process's ID, for CONNECT_V2 and MODULE_READY: Node's, or 0 in a
// browser, which has none. The web manager sends its own process ID to the
// message manager in place of this one.
function local_pid() {
  return globalThis.process?.pid ?? 0;
}

/**
 * Thrown when a method that sends needs the client to be connected, and it
 * isn't: before on_connect, or after it disconnects.
 */
export class NotConnectedError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotConnectedError";
  }
}

/**
 * A message header.
 *
 * @typedef {object} RTMAHeader
 * @property {number} msg_type The message type ID.
 * @property {number} msg_count The sender's count of messages it has sent.
 * @property {number} send_time When it was sent, in seconds on the sender's
 *   clock. rtma-js uses seconds since the epoch, and pyrtma a clock that
 *   other processes don't share.
 * @property {number} recv_time When this client received it, in seconds
 *   since the epoch.
 * @property {number} src_host_id The sender's host ID.
 * @property {number} src_mod_id The sender's module ID.
 * @property {number} dest_host_id The host it was sent to, or 0 for all.
 * @property {number} dest_mod_id The module it was sent to, or 0 for every
 *   subscriber.
 * @property {number} num_data_bytes The size of its data, in bytes.
 * @property {number} remaining_bytes
 * @property {number} is_dynamic
 * @property {number} reserved
 */

/**
 * A message, as on_message receives it.
 *
 * @typedef {object} RTMAMessage
 * @property {RTMAHeader} header The header.
 * @property {object | null} data The fields, named as in the message
 *   definition, or null for a signal, a message type with no fields.
 */

/**
 * A client of an RTMA message manager, through the pyrtma web manager.
 *
 * Set the on_* handlers, then call connect(). Subscribe and send from
 * on_connect onward.
 */
export class RTMAClient {
  /**
   * @param {string} [server="127.0.0.1"] The web manager's host name or
   *   address, which connects with ws://, or a ws:// or wss:// URL, which
   *   may include a path.
   * @param {number} [port=5678] The web manager's port, used unless the
   *   server URL gives one.
   * @param {number} [module_id=0] The module ID to request. The web manager
   *   always assigns a dynamic ID, which is in module_id once connected.
   * @param {number} [host_id=0] The host ID put in the messages sent.
   * @param {string} [name=""] The module name the message manager shows:
   *   ASCII, up to 31 characters.
   * @throws {RangeError} The server or name isn't valid.
   */
  constructor(
    server = "127.0.0.1",
    port = 5678,
    module_id = 0,
    host_id = 0,
    name = ""
  ) {
    if (!/^[\x01-\x7f]*$/.test(name) || name.length > MAX_NAME_CHARS) {
      throw new RangeError(
        `rtma.js: module name "${name}" must be ASCII, up to ${MAX_NAME_CHARS} characters`
      );
    }
    this.server = server;
    this.port = port;
    this.url = websocket_url(server, port);
    this.ready = false;
    this.error = false;
    this.connected = false;
    this.host_id = host_id;
    this.module_id = module_id;
    this.name = name;
    this.msg_count = 0;
    this.pending_ack = false;
    this.ws = null;
    this.connect_ack = false;
    this.subscribed_types = new Set([]);
    this.paused_types = new Set([]);
    this.keepalive_timer = null;

    /**
     * Called when the message manager has accepted the connection. Subscribe
     * here.
     * @type {() => void}
     */
    this.on_connect = () => {};

    this._on_connect = (msg) => {
      this.connected = true;
      // Store module id if dynamically assigned
      if (msg.header.dest_mod_id !== 0) {
        this.module_id = msg.header.dest_mod_id;
        console.log(`rtma.js: Connected with mod ID ${this.module_id}`);
      }

      this.on_connect();
    };

    /**
     * Called once when the websocket closes, or fails to open. Call
     * connect() to connect again.
     * @type {() => void}
     */
    this.on_disconnect = () => {};

    /**
     * Called with a websocket error event, or with an object holding an
     * rtma_msg_error string, which the web manager sends when it can't do
     * what the client asked.
     * @type {(error: Event | {rtma_msg_error: string}) => void}
     */
    this.on_error = (event) => {
      console.error("rtma.js error");
    };

    this._on_disconnect = () => {
      console.log("rtma.js: disconnected");
      this.on_disconnect();
    };

    /**
     * Called for each message received, including the message manager's
     * ACK of the connection.
     * @type {(msg: RTMAMessage) => void}
     */
    this.on_message = (msg) => {
      console.log(`rmta.js on_message: ${JSON.stringify(msg)}`);
    };
  }

  _start_keepalive() {
    this._stop_keepalive();
    this.keepalive_timer = setInterval(this._send_keepalive.bind(this), 750);
  }

  _stop_keepalive() {
    if (this.keepalive_timer !== null) {
      clearInterval(this.keepalive_timer);
      this.keepalive_timer = null;
    }
  }

  _send_keepalive() {
    if (this.ws && this.ws.readyState === this.ws.OPEN && this.connected) {
      this.ws.send("PING");
    }
  }

  _require_connection(what) {
    if (!this.connected) {
      throw new NotConnectedError(
        `rtma.js: ${what} needs a connection; call connect() and wait for on_connect`
      );
    }
  }

  /**
   * Send a message.
   *
   * @param {number} msg_type The message type ID.
   * @param {object} msg_data The fields, as from the definitions' MDF
   *   function for the type.
   * @param {number} [dest_mod_id=0] The module to send it to, or 0 for
   *   every subscriber.
   * @param {number} [dest_host_id=0] The host to send it to, or 0 for all.
   * @throws {NotConnectedError} The client isn't connected.
   */
  send_message(msg_type, msg_data, dest_mod_id = 0, dest_host_id = 0) {
    this._require_connection("send_message()");
    this._send_message(msg_type, msg_data, dest_mod_id, dest_host_id);
  }

  /**
   * Send a signal, a message type with no fields.
   *
   * @param {number} msg_type The message type ID.
   * @param {number} [dest_mod_id=0] The module to send it to, or 0 for
   *   every subscriber.
   * @param {number} [dest_host_id=0] The host to send it to, or 0 for all.
   * @throws {NotConnectedError} The client isn't connected.
   */
  send_signal(msg_type, dest_mod_id = 0, dest_host_id = 0) {
    this._require_connection("send_signal()");
    this._send_signal(msg_type, dest_mod_id, dest_host_id);
  }

  // Like send_message() and send_signal(), but without the check, for the
  // messages that connect and disconnect.
  _send_message(msg_type, msg_data, dest_mod_id = 0, dest_host_id = 0) {
    const hdr = CORE.MDF.RTMA_MSG_HEADER();
    hdr.msg_type = msg_type;
    hdr.msg_count = this.msg_count;
    hdr.recv_time = 0;
    hdr.send_time = now_seconds();
    hdr.src_host_id = this.host_id;
    hdr.src_mod_id = this.module_id;
    hdr.dest_host_id = dest_host_id;
    hdr.dest_mod_id = dest_mod_id;

    // The ws proxy will fill this data in after serializing
    hdr.num_data_bytes = 0;

    // Send through the websocket
    this.ws.send(to_json({ header: hdr, data: msg_data }));

    this.msg_count++;
  }

  _send_signal(msg_type, dest_mod_id = 0, dest_host_id = 0) {
    const hdr = CORE.MDF.RTMA_MSG_HEADER();
    hdr.msg_type = msg_type;
    hdr.msg_count = this.msg_count;
    hdr.send_time = now_seconds();
    hdr.src_host_id = this.host_id;
    hdr.src_mod_id = this.module_id;
    hdr.dest_host_id = dest_host_id;
    hdr.dest_mod_id = dest_mod_id;
    hdr.num_data_bytes = 0;

    // Send through the websocket
    this.ws.send(JSON.stringify({ header: hdr, data: null }));

    this.msg_count++;
  }

  _connect() {
    console.log("rtma.js: connect");
    const msg = CORE.MDF.CONNECT_V2();
    msg.logger_status = 0;
    msg.mod_id = this.module_id;
    msg.pid = local_pid();
    msg.name = this.name;
    this._send_message(CORE.MT.CONNECT_V2, msg);
    this.connect_ack = true;
  }

  /** Disconnect from the message manager and close the websocket. */
  disconnect() {
    if (this.ws && this.ws.readyState < this.ws.CLOSED && this.connected) {
      this._send_signal(CORE.MT.DISCONNECT);
      if (this.ws.readyState < this.ws.CLOSING) {
        this.ws.close();
      }
    }
    this.ready = false;
    this.connected = false;
  }

  /**
   * Subscribe to message types.
   *
   * @param {number[] | Set<number>} msg_types The message type IDs.
   * @throws {NotConnectedError} The client isn't connected.
   */
  subscribe(msg_types) {
    this._require_connection("subscribe()");
    msg_types.forEach((msg_type) => {
      const msg = CORE.MDF.SUBSCRIBE();
      msg.msg_type = msg_type;
      console.log(`rtma.js: Subscribing to ${msg_type}`);
      this.send_message(CORE.MT.SUBSCRIBE, msg);
      this.subscribed_types.add(msg_type);
      this.paused_types.delete(msg_type);
    });
  }

  /**
   * Unsubscribe from message types.
   *
   * @param {number[] | Set<number>} msg_types The message type IDs.
   * @throws {NotConnectedError} The client isn't connected.
   */
  unsubscribe(msg_types) {
    this._require_connection("unsubscribe()");
    msg_types.forEach((msg_type) => {
      const msg = CORE.MDF.UNSUBSCRIBE();
      msg.msg_type = msg_type;
      console.log(`rtma.js: Unsubscribing to ${msg_type}`);
      this.send_message(CORE.MT.UNSUBSCRIBE, msg);
      this.subscribed_types.delete(msg_type);
      this.paused_types.delete(msg_type);
    });
  }

  /**
   * Pause subscriptions: the message manager stops sending the types until
   * they are resumed. They move from subscribed_types to paused_types.
   *
   * @param {number[] | Set<number>} msg_types The message type IDs.
   * @throws {NotConnectedError} The client isn't connected.
   */
  pause_subscription(msg_types) {
    this._require_connection("pause_subscription()");
    msg_types.forEach((msg_type) => {
      const msg = CORE.MDF.PAUSE_SUBSCRIPTION();
      msg.msg_type = msg_type;
      console.log(`rtma.js: Pausing subscription to ${msg_type}`);
      this.send_message(CORE.MT.PAUSE_SUBSCRIPTION, msg);
      this.subscribed_types.delete(msg_type);
      this.paused_types.add(msg_type);
    });
  }

  /**
   * Resume paused subscriptions.
   *
   * @param {number[] | Set<number>} msg_types The message type IDs.
   * @throws {NotConnectedError} The client isn't connected.
   */
  resume_subscription(msg_types) {
    this._require_connection("resume_subscription()");
    msg_types.forEach((msg_type) => {
      const msg = CORE.MDF.RESUME_SUBSCRIPTION();
      msg.msg_type = msg_type;
      console.log(`rtma.js: Resuming subscription to ${msg_type}`);
      this.send_message(CORE.MT.RESUME_SUBSCRIPTION, msg);
      this.subscribed_types.add(msg_type);
      this.paused_types.delete(msg_type);
    });
  }

  /**
   * Unsubscribe from every subscribed type, and forget the paused ones,
   * which have no subscription to end.
   *
   * @throws {NotConnectedError} The client isn't connected.
   */
  unsubscribe_from_all() {
    this._require_connection("unsubscribe_from_all()");
    this.unsubscribe([...this.subscribed_types]);
    this.paused_types.clear();
  }

  /**
   * Pause every subscription.
   *
   * @throws {NotConnectedError} The client isn't connected.
   */
  pause_all_subscriptions() {
    this._require_connection("pause_all_subscriptions()");
    this.pause_subscription([...this.subscribed_types]);
  }

  /**
   * Resume every paused subscription.
   *
   * @throws {NotConnectedError} The client isn't connected.
   */
  resume_all_subscriptions() {
    this._require_connection("resume_all_subscriptions()");
    this.resume_subscription([...this.paused_types]);
  }

  /**
   * Send MODULE_READY, which the message manager announces with a HELLO.
   *
   * @throws {NotConnectedError} The client isn't connected.
   */
  send_module_ready() {
    this._require_connection("send_module_ready()");
    const msg = CORE.MDF.MODULE_READY();
    msg.pid = local_pid();
    this.send_message(CORE.MT.MODULE_READY, msg);
  }

  error_handler(msg) {
    console.error(`rtma.js error: ${msg.error}`);
    this.disconnect();
    this.connected = false;
    this.ready = false;
  }

  msg_error_handler(msg) {
    console.error(`rtma.js msg error: ${msg.rtma_msg_error}`);
    this.on_error(msg);
  }

  core_msg_handler(msg) {
    switch (msg.header.msg_type) {
      case CORE.MT.ACKNOWLEDGE:
        if (this.connect_ack) {
          this.connect_ack = false;
          this._on_connect(msg);
        }
        break;
      case CORE.MT.EXIT:
        break;
      default:
        break;
    }
  }

  // Log messages go to the console always, and to the message manager while
  // connected, as with pyrtma's client logger.
  _send_log(msg_type, msg) {
    if (this.connected) {
      this.send_message(msg_type, msg);
    }
  }

  /**
   * Log a message at critical level (50): to the console, and to the
   * message manager while connected.
   *
   * @param {string} msg_text The text, up to 1023 characters.
   */
  log_critical(msg_text) {
    const msg = CORE.MDF.RTMA_LOG_CRITICAL();
    msg.time = now_seconds();
    msg.level = 50;
    msg.name = this.name || this.module_id.toString();
    msg.message = msg_text;
    
    console.error("CRITICAL: " + msg_text);

    this._send_log(CORE.MT.RTMA_LOG_CRITICAL, msg);
  }

  /**
   * Log a message at error level (40): to the console, and to the
   * message manager while connected.
   *
   * @param {string} msg_text The text, up to 1023 characters.
   */
  log_error(msg_text) {
    const msg = CORE.MDF.RTMA_LOG_ERROR();
    msg.time = now_seconds();
    msg.level = 40;
    msg.name = this.name || this.module_id.toString();
    msg.message = msg_text;
    
    console.error("ERROR: " + msg_text);

    this._send_log(CORE.MT.RTMA_LOG_ERROR, msg);
  }

  /**
   * Log a message at warning level (30): to the console, and to the
   * message manager while connected.
   *
   * @param {string} msg_text The text, up to 1023 characters.
   */
  log_warning(msg_text) {
    const msg = CORE.MDF.RTMA_LOG_WARNING();
    msg.time = now_seconds();
    msg.level = 30;
    msg.name = this.name || this.module_id.toString();
    msg.message = msg_text;
    
    console.warn("WARNING: " + msg_text);

    this._send_log(CORE.MT.RTMA_LOG_WARNING, msg);
  }

  /**
   * Log a message at info level (20): to the console, and to the
   * message manager while connected.
   *
   * @param {string} msg_text The text, up to 1023 characters.
   */
  log_info(msg_text) {
    const msg = CORE.MDF.RTMA_LOG_INFO();
    msg.time = now_seconds();
    msg.level = 20;
    msg.name = this.name || this.module_id.toString();
    msg.message = msg_text;
    
    console.log("INFO: " + msg_text);

    this._send_log(CORE.MT.RTMA_LOG_INFO, msg);
  }

  /**
   * Log a message at debug level (10): to the console, and to the
   * message manager while connected.
   *
   * @param {string} msg_text The text, up to 1023 characters.
   */
  log_debug(msg_text) {
    const msg = CORE.MDF.RTMA_LOG_DEBUG();
    msg.time = now_seconds();
    msg.level = 10;
    msg.name = this.name || this.module_id.toString();
    msg.message = msg_text;
    
    console.debug("DEBUG: " + msg_text);

    this._send_log(CORE.MT.RTMA_LOG_DEBUG, msg);
  }

  /**
   * Log a message at any level: to the console, and to the message manager
   * as RTMA_LOG while connected.
   *
   * @param {string} msg_text The text, up to 1023 characters.
   * @param {number} [level=0] The level, as in Python's logging module.
   */
  log(msg_text, level = 0) {
    const msg = CORE.MDF.RTMA_LOG();
    msg.time = now_seconds();
    msg.level = level;
    msg.name = this.name || this.module_id.toString();
    msg.message = msg_text;
    
    if (level < 20) { console.debug("LOG: " + msg_text); }
    else if (level < 30) { console.log("LOG: " + msg_text); }
    else if (level < 40) { console.warn("LOG: " + msg_text); }
    else { console.error("LOG: " + msg_text); }

    this._send_log(CORE.MT.RTMA_LOG, msg);
  }

  /**
   * Open the websocket and connect to the message manager. on_connect is
   * called when the message manager accepts the connection, and
   * on_disconnect if it fails.
   */
  connect() {
    // Each websocket gets a new proxy client, which has no subscriptions.
    this.subscribed_types.clear();
    this.paused_types.clear();
    this.ws = new WebSocket(this.url);
    const self = this;

    // on_disconnect is called once for each websocket. When a connection
    // fails before it opens, Node 22's WebSocket fires error but never
    // close, so the error handler reports the close itself, and a close
    // that follows, as in a browser, is then ignored.
    let opened = false;
    let closed = false;
    const on_close = () => {
      if (closed) return;
      closed = true;
      self._stop_keepalive();
      self.ready = false;
      self.connected = false;
      self.disconnect();
      self._on_disconnect();
    };

    this.ws.onopen = (event) => {
      opened = true;
      self.ready = true;
      self.connected = false;
      self._start_keepalive();
      self._connect();
    };

    this.ws.onclose = (event) => on_close();

    this.ws.onerror = (event) => {
      self.ready = false;
      self.error = event;
      self.on_error(event);
      if (!opened) on_close();
    };

    this.ws.onmessage = (event) => {
      // Get a timestamp
      const now = now_seconds();

      if (event.data === "PONG") {
        return;
      }

      // Decode the rtma msg as json
      const msg = parse_json(event.data);

      // Handle error messages from the ws server
      if (msg.hasOwnProperty("error")) {
        self.error_handler(msg);
        return;
      }

      // Handle RTMA error
      if (msg.hasOwnProperty("rtma_msg_error")) {
        self.msg_error_handler(msg);
        return;
      }

      // Call the internal handler
      self.core_msg_handler(msg);

      // Over-write the proxy recv_time
      msg.header.recv_time = now;

      // Call the user installed message handler
      self.on_message(msg);
    };
  }
}
