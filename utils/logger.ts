/**
 * Logger utility to control console output
 * Set LOG_LEVEL in your environment or modify ENABLE_LOGS to control logging
 */

const LOG_LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
} as const;

// Set to false to disable all logs, or use LOG_LEVEL to control verbosity
// Disable debug logs to prevent console overflow - only show errors and warnings
const ENABLE_LOGS = __DEV__; // Only log in development
// Use WARN level to only show errors and warnings, not debug/info logs
const CURRENT_LOG_LEVEL = ENABLE_LOGS ? LOG_LEVELS.WARN : LOG_LEVELS.ERROR;

const logger = {
  error: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      console.log(...args);
    }
  },
  debug: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(...args);
    }
  },
  log: (...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(...args);
    }
  },
};

export default logger;

