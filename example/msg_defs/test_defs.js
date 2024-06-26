// This message def file was auto-generated by pyrtma.compile version 2.2.1

export { RTMA } ;

// Type Map Default Values
const type_map = {};
type_map.char = () => "";
type_map.unsigned_char = () => 0;
type_map.byte = () => 0;
type_map.int = () => 0;
type_map.signed_int = () => 0;
type_map.unsigned_int = () => 0;
type_map.unsigned = () => 0;
type_map.short = () => 0;
type_map.signed_short = () => 0;
type_map.unsigned_short = () => 0;
type_map.long = () => 0;
type_map.signed_long = () => 0;
type_map.unsigned_long = () => 0;
type_map.long_long = () => 0;
type_map.signed_long_long = () => 0;
type_map.unsigned_long_long = () => 0;
type_map.float = () => 0;
type_map.double = () => 0;
type_map.uint8 = () => 0;
type_map.uint16 = () => 0;
type_map.uint32 = () => 0;
type_map.uint64 = () => 0;
type_map.int8 = () => 0;
type_map.int16 = () => 0;
type_map.int32 = () => 0;
type_map.int64 = () => 0;

// Top-Level RTMA object
const RTMA = {};
RTMA.COMPILED_PYRTMA_VERSION = "2.2.1";

// Constants
RTMA.constants =  {};
RTMA.constants.MAX_MODULES = 200;
RTMA.constants.DYN_MOD_ID_START = 100;
RTMA.constants.MAX_HOSTS = 5;
RTMA.constants.MAX_MESSAGE_TYPES = 10000;
RTMA.constants.MIN_STREAM_TYPE = 9000;
RTMA.constants.MAX_TIMERS = 100;
RTMA.constants.MAX_INTERNAL_TIMERS = 20;
RTMA.constants.MAX_RTMA_MSG_TYPE = 99;
RTMA.constants.MAX_RTMA_MODULE_ID = 9;
RTMA.constants.MAX_LOGGER_FILENAME_LENGTH = 256;
RTMA.constants.MAX_CONTIGUOUS_MESSAGE_DATA = 9000;
RTMA.constants.ALL_MESSAGE_TYPES = 2147483647;

// String Constants

// Type Aliases
RTMA.aliases =  {};

RTMA.aliases.MODULE_ID = type_map.short();
RTMA.aliases.HOST_ID = type_map.short();
RTMA.aliases.MSG_TYPE = type_map.int();
RTMA.aliases.MSG_COUNT = type_map.int();

// Host IDs
RTMA.HID =  {};

RTMA.HID.LOCAL_HOST = 0;
RTMA.HID.ALL_HOSTS = 32767;

// Module IDs
RTMA.MID =  {};

RTMA.MID.MESSAGE_MANAGER = 0;
RTMA.MID.QUICK_LOGGER = 5;

// Message Type IDs
RTMA.MT = {};

RTMA.MT.EXIT = 0;
RTMA.MT.KILL = 1;
RTMA.MT.ACKNOWLEDGE = 2;
RTMA.MT.FAIL_SUBSCRIBE = 6;
RTMA.MT.FAILED_MESSAGE = 8;
RTMA.MT.CONNECT = 13;
RTMA.MT.DISCONNECT = 14;
RTMA.MT.SUBSCRIBE = 15;
RTMA.MT.UNSUBSCRIBE = 16;
RTMA.MT.MODULE_READY = 26;
RTMA.MT.LM_EXIT = 55;
RTMA.MT.SAVE_MESSAGE_LOG = 56;
RTMA.MT.MESSAGE_LOG_SAVED = 57;
RTMA.MT.PAUSE_MESSAGE_LOGGING = 58;
RTMA.MT.RESUME_MESSAGE_LOGGING = 59;
RTMA.MT.RESET_MESSAGE_LOG = 60;
RTMA.MT.DUMP_MESSAGE_LOG = 61;
RTMA.MT.TIMING_MESSAGE = 80;
RTMA.MT.FORCE_DISCONNECT = 82;
RTMA.MT.PAUSE_SUBSCRIPTION = 85;
RTMA.MT.RESUME_SUBSCRIPTION = 86;
RTMA.MT.LM_READY = 96;
RTMA.MT.PING = 1000;
RTMA.MT.RASTER = 1001;
RTMA.MT.STATUS = 1002;

// Struct Definitions
RTMA.SDF = {};

RTMA.SDF.RTMA_MSG_HEADER = () => {
	return {
		msg_type: RTMA.aliases.MSG_TYPE(),
		msg_count: RTMA.aliases.MSG_COUNT(),
		send_time: type_map.double(),
		recv_time: type_map.double(),
		src_host_id: RTMA.aliases.HOST_ID(),
		src_mod_id: RTMA.aliases.MODULE_ID(),
		dest_host_id: RTMA.aliases.HOST_ID(),
		dest_mod_id: RTMA.aliases.MODULE_ID(),
		num_data_bytes: type_map.int(),
		remaining_bytes: type_map.int(),
		is_dynamic: type_map.int(),
		reserved: type_map.unsigned_int()
	}
};

// Message Definitions
RTMA.MDF = {};

RTMA.MDF.EXIT = () => { return {} };

RTMA.MDF.KILL = () => { return {} };

RTMA.MDF.ACKNOWLEDGE = () => { return {} };

RTMA.MDF.FAIL_SUBSCRIBE = () => {
	return {
		mod_id: RTMA.aliases.MODULE_ID(),
		reserved: type_map.short(),
		msg_type: RTMA.aliases.MSG_TYPE()
	}
};

RTMA.MDF.FAILED_MESSAGE = () => {
	return {
		dest_mod_id: RTMA.aliases.MODULE_ID(),
		reserved: Array(3).fill(type_map.short()),
		time_of_failure: type_map.double(),
		msg_header: RTMA.SDF.RTMA_MSG_HEADER()
	}
};

RTMA.MDF.CONNECT = () => {
	return {
		logger_status: type_map.short(),
		daemon_status: type_map.short()
	}
};

RTMA.MDF.DISCONNECT = () => { return {} };

RTMA.MDF.SUBSCRIBE = () => {
	return {
		msg_type: RTMA.aliases.MSG_TYPE()
	}
};

RTMA.MDF.UNSUBSCRIBE = () => {
	return {
		msg_type: RTMA.aliases.MSG_TYPE()
	}
};

RTMA.MDF.MODULE_READY = () => {
	return {
		pid: type_map.int()
	}
};

RTMA.MDF.LM_EXIT = () => { return {} };

RTMA.MDF.SAVE_MESSAGE_LOG = () => {
	return {
		pathname: Array(256).fill(type_map.char()),
		pathname_length: type_map.int()
	}
};

RTMA.MDF.MESSAGE_LOG_SAVED = () => { return {} };

RTMA.MDF.PAUSE_MESSAGE_LOGGING = () => { return {} };

RTMA.MDF.RESUME_MESSAGE_LOGGING = () => { return {} };

RTMA.MDF.RESET_MESSAGE_LOG = () => { return {} };

RTMA.MDF.DUMP_MESSAGE_LOG = () => { return {} };

RTMA.MDF.TIMING_MESSAGE = () => {
	return {
		timing: Array(10000).fill(type_map.unsigned_short()),
		ModulePID: Array(200).fill(type_map.int()),
		send_time: type_map.double()
	}
};

RTMA.MDF.FORCE_DISCONNECT = () => {
	return {
		mod_id: type_map.int()
	}
};

RTMA.MDF.PAUSE_SUBSCRIPTION = () => {
	return {
		msg_type: RTMA.aliases.MSG_TYPE()
	}
};

RTMA.MDF.RESUME_SUBSCRIPTION = () => {
	return {
		msg_type: RTMA.aliases.MSG_TYPE()
	}
};

RTMA.MDF.LM_READY = () => { return {} };

RTMA.MDF.PING = () => {
	return {
		serial_no: type_map.int()
	}
};

RTMA.MDF.RASTER = () => {
	return {
		seq_no: type_map.unsigned_long(),
		bins: Array(32).fill(type_map.unsigned_long()),
		ai_0: Array(32).fill(type_map.unsigned_char()),
		ai_1: Array(32).fill(type_map.unsigned_char()),
		ai_2: Array(32).fill(type_map.unsigned_char()),
		ai_3: Array(32).fill(type_map.unsigned_char()),
		ai_4: Array(32).fill(type_map.unsigned_char()),
		ai_5: Array(32).fill(type_map.unsigned_char()),
		ai_6: Array(32).fill(type_map.unsigned_char()),
		ai_7: Array(32).fill(type_map.unsigned_char()),
		ai_8: Array(32).fill(type_map.unsigned_char()),
		ai_9: Array(32).fill(type_map.unsigned_char()),
		ai_10: Array(32).fill(type_map.unsigned_char()),
		ai_11: Array(32).fill(type_map.unsigned_char())
	}
};

RTMA.MDF.STATUS = () => {
	return {
		msg_length: type_map.int(),
		msg: Array(1024).fill(type_map.char())
	}
};

// Message Definition Hashes
RTMA.HASH = {};

RTMA.HASH.EXIT = "095e0546";
RTMA.HASH.KILL = "82fc702d";
RTMA.HASH.ACKNOWLEDGE = "b725b581";
RTMA.HASH.FAIL_SUBSCRIBE = "9ad70a15";
RTMA.HASH.FAILED_MESSAGE = "dca545b2";
RTMA.HASH.CONNECT = "6f2e3ca5";
RTMA.HASH.DISCONNECT = "d0126bf9";
RTMA.HASH.SUBSCRIBE = "f5b437c8";
RTMA.HASH.UNSUBSCRIBE = "193fb9e0";
RTMA.HASH.MODULE_READY = "0df81813";
RTMA.HASH.LM_EXIT = "35dd547b";
RTMA.HASH.SAVE_MESSAGE_LOG = "515569e9";
RTMA.HASH.MESSAGE_LOG_SAVED = "66e84ae5";
RTMA.HASH.PAUSE_MESSAGE_LOGGING = "20c1e922";
RTMA.HASH.RESUME_MESSAGE_LOGGING = "0d1a3e77";
RTMA.HASH.RESET_MESSAGE_LOG = "68ec4aab";
RTMA.HASH.DUMP_MESSAGE_LOG = "f9d7e2bf";
RTMA.HASH.TIMING_MESSAGE = "3595c23e";
RTMA.HASH.FORCE_DISCONNECT = "c37c54e8";
RTMA.HASH.PAUSE_SUBSCRIPTION = "22338a6d";
RTMA.HASH.RESUME_SUBSCRIPTION = "c56a97f2";
RTMA.HASH.LM_READY = "4863b960";
RTMA.HASH.PING = "e6f432ea";
RTMA.HASH.RASTER = "da51540c";
RTMA.HASH.STATUS = "704571a8";
