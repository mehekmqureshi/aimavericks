/**
 * Structured Logging Utility
 * 
 * Provides consistent logging format across all Lambda functions with
 * timestamp, requestId, function name, and log level.
 * 
 * Requirements: 29.3, 29.4
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  requestId?: string;
  functionName?: string;
  userId?: string;
  manufacturerId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Logger class for structured logging
 * 
 * Features:
 * - Consistent JSON format for all logs
 * - Automatic timestamp generation
 * - Context propagation (requestId, functionName, etc.)
 * - Support for ERROR, WARN, INFO, DEBUG levels
 * - Error object serialization with stack traces
 * 
 * Requirement: 29.4
 */
export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}, minLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.minLevel = minLevel;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(
      { ...this.context, ...additionalContext },
      this.minLevel
    );
  }

  /**
   * Update the logger context
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Log a DEBUG level message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log an INFO level message
   * 
   * Requirement: 29.3 - Log all API requests with timestamp, endpoint, and response status
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log a WARN level message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log an ERROR level message
   * 
   * Requirement: 29.1 - Log errors to CloudWatch with stack trace
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    // Check if log level should be output
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...(metadata && { metadata }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    // Output to console (CloudWatch captures console output)
    const logString = JSON.stringify(logEntry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.INFO:
        console.info(logString);
        break;
      case LogLevel.DEBUG:
        console.debug(logString);
        break;
    }
  }

  /**
   * Determine if a log level should be output based on minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(level);
    const minLevelIndex = levels.indexOf(this.minLevel);
    return currentLevelIndex >= minLevelIndex;
  }
}

/**
 * Create a logger instance for Lambda functions
 * 
 * @param functionName - Name of the Lambda function
 * @param requestId - Request ID from API Gateway event
 * @returns Logger instance with function context
 */
export function createLambdaLogger(
  functionName: string,
  requestId?: string
): Logger {
  const minLevel = process.env.LOG_LEVEL
    ? (process.env.LOG_LEVEL as LogLevel)
    : LogLevel.INFO;

  return new Logger(
    {
      functionName,
      requestId,
    },
    minLevel
  );
}

/**
 * Log API request details
 * 
 * Requirement: 29.3 - Log all API requests with timestamp, endpoint, and response status
 */
export function logApiRequest(
  logger: Logger,
  method: string,
  path: string,
  statusCode: number,
  durationMs?: number
): void {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    durationMs,
  });
}

/**
 * Log API error details
 * 
 * Requirement: 29.1 - Log errors to CloudWatch with stack trace
 */
export function logApiError(
  logger: Logger,
  method: string,
  path: string,
  error: Error,
  statusCode: number = 500
): void {
  logger.error('API Error', error, {
    method,
    path,
    statusCode,
  });
}
