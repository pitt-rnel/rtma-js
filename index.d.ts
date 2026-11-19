// Type declarations for rtma-js. src/rtma.js is plain JavaScript, and these
// describe its public API for editors and TypeScript. Keep them in step with
// it: test/types.test.mjs checks that the names here match the client's.

/** A message header. */
export interface RTMAHeader {
  /** The message type ID. */
  msg_type: number;
  /** The sender's count of messages it has sent. */
  msg_count: number;
  /**
   * When it was sent, in seconds on the sender's clock. rtma-js uses seconds
   * since the epoch, and pyrtma a clock that other processes don't share.
   */
  send_time: number;
  /** When this client received it, in seconds since the epoch. */
  recv_time: number;
  /** The sender's host ID. */
  src_host_id: number;
  /** The sender's module ID. */
  src_mod_id: number;
  /** The host it was sent to, or 0 for all. */
  dest_host_id: number;
  /** The module it was sent to, or 0 for every subscriber. */
  dest_mod_id: number;
  /** The size of its data, in bytes. */
  num_data_bytes: number;
  remaining_bytes: number;
  is_dynamic: number;
  reserved: number;
}

/** A message, as on_message receives it. */
export interface RTMAMessage {
  header: RTMAHeader;
  /**
   * The fields, named as in the message definition, or null for a signal, a
   * message type with no fields.
   */
  data: any;
}

/** What the web manager sends when it can't do what the client asked. */
export interface RTMAMessageError {
  rtma_msg_error: string;
}

/**
 * Thrown when a method that sends needs the client to be connected, and it
 * isn't: before on_connect, or after it disconnects.
 */
export class NotConnectedError extends Error {
  constructor(message?: string);
}

/**
 * A client of an RTMA message manager, through the pyrtma web manager.
 *
 * Set the on_* handlers, then call connect(). Subscribe and send from
 * on_connect onward.
 */
export class RTMAClient {
  /**
   * @param server The web manager's host name or address, which connects
   *   with ws://, or a ws:// or wss:// URL, which may include a path.
   *   Defaults to "127.0.0.1".
   * @param port The web manager's port, used unless the server URL gives
   *   one. Defaults to 5678.
   * @param module_id The module ID to request. The web manager always
   *   assigns a dynamic ID, which is in module_id once connected.
   * @param host_id The host ID put in the messages sent.
   * @param name The module name the message manager shows: ASCII, up to 31
   *   characters.
   * @throws {RangeError} The server or name isn't valid.
   */
  constructor(
    server?: string,
    port?: number,
    module_id?: number,
    host_id?: number,
    name?: string
  );

  /** The server argument, as given. */
  server: string;
  /** The port argument, as given. */
  port: number;
  /** The websocket URL the client connects to. */
  url: string;
  /** The module ID: the one assigned by the web manager, once connected. */
  module_id: number;
  host_id: number;
  /** The module name. */
  name: string;
  /** Whether the message manager has accepted the connection. */
  connected: boolean;
  /** Whether the websocket is open. */
  ready: boolean;
  /** The last websocket error event, or false. */
  error: Event | false;
  /** The count of messages sent. */
  msg_count: number;
  /** The types subscribed to, not counting paused ones. */
  subscribed_types: Set<number>;
  /** The types whose subscriptions are paused. */
  paused_types: Set<number>;
  /** The websocket, once connect() has been called. */
  ws: WebSocket | null;

  /** Called when the message manager has accepted the connection. */
  on_connect: () => void;
  /** Called once when the websocket closes, or fails to open. */
  on_disconnect: () => void;
  /** Called with a websocket error event, or an error from the web manager. */
  on_error: (error: Event | RTMAMessageError) => void;
  /** Called for each message received, including the connection's ACK. */
  on_message: (msg: RTMAMessage) => void;

  /** Open the websocket and connect to the message manager. */
  connect(): void;
  /** Disconnect from the message manager and close the websocket. */
  disconnect(): void;

  /**
   * Send a message.
   * @param msg_type The message type ID.
   * @param msg_data The fields, as from the definitions' MDF function.
   * @param dest_mod_id The module to send it to, or 0 for every subscriber.
   * @param dest_host_id The host to send it to, or 0 for all.
   * @throws {NotConnectedError} The client isn't connected.
   */
  send_message(
    msg_type: number,
    msg_data: object,
    dest_mod_id?: number,
    dest_host_id?: number
  ): void;
  /**
   * Send a signal, a message type with no fields.
   * @throws {NotConnectedError} The client isn't connected.
   */
  send_signal(msg_type: number, dest_mod_id?: number, dest_host_id?: number): void;
  /** Send MODULE_READY. @throws {NotConnectedError} */
  send_module_ready(): void;

  /** Subscribe to message types. @throws {NotConnectedError} */
  subscribe(msg_types: number[] | Set<number>): void;
  /** Unsubscribe from message types. @throws {NotConnectedError} */
  unsubscribe(msg_types: number[] | Set<number>): void;
  /** Pause subscriptions until resumed. @throws {NotConnectedError} */
  pause_subscription(msg_types: number[] | Set<number>): void;
  /** Resume paused subscriptions. @throws {NotConnectedError} */
  resume_subscription(msg_types: number[] | Set<number>): void;
  /** Unsubscribe from everything, and forget paused types. @throws {NotConnectedError} */
  unsubscribe_from_all(): void;
  /** Pause every subscription. @throws {NotConnectedError} */
  pause_all_subscriptions(): void;
  /** Resume every paused subscription. @throws {NotConnectedError} */
  resume_all_subscriptions(): void;

  /** Log at critical level (50): to the console, and sent while connected. */
  log_critical(msg_text: string): void;
  /** Log at error level (40): to the console, and sent while connected. */
  log_error(msg_text: string): void;
  /** Log at warning level (30): to the console, and sent while connected. */
  log_warning(msg_text: string): void;
  /** Log at info level (20): to the console, and sent while connected. */
  log_info(msg_text: string): void;
  /** Log at debug level (10): to the console, and sent while connected. */
  log_debug(msg_text: string): void;
  /** Log at any level, as in Python's logging module, as RTMA_LOG. */
  log(msg_text: string, level?: number): void;
}
