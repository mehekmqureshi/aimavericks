/**
 * Error Handling Middleware
 * 
 * Provides try-catch wrapper for Lambda handlers with structured error responses
 * and CloudWatch logging.
 * 
 * Requirements: 21.4, 21.5, 29.1, 29.2
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger, createLambdaLogger, logApiRequest, logApiError } from '../utils/logger';
import { ErrorResponse } from '../../shared/types';

/**
 * Lambda handler function type
 */
export type LambdaHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
  logger: Logger
) => Promise<APIGatewayProxyResult>;

/**
 * Error types for classification
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  BAD_REQUEST = 'BAD_REQUEST',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler wrapper for Lambda functions
 * 
 * Features:
 * - Automatic try-catch wrapping
 * - Structured error logging to CloudWatch
 * - User-friendly error responses
 * - Request/response logging
 * - Performance timing
 * 
 * Requirements: 21.4, 21.5, 29.1, 29.2
 * 
 * @param handler - Lambda handler function to wrap
 * @param functionName - Name of the Lambda function for logging
 * @returns Wrapped handler with error handling
 */
export function withErrorHandler(
  handler: LambdaHandler,
  functionName: string
): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  return async (
    event: APIGatewayProxyEvent,
    context: Context
  ): Promise<APIGatewayProxyResult> => {
    const startTime = Date.now();
    const requestId = event.requestContext.requestId;
    const logger = createLambdaLogger(functionName, requestId);

    // Log incoming request
    logger.info('Incoming request', {
      method: event.httpMethod,
      path: event.path,
      queryParams: event.queryStringParameters,
      headers: sanitizeHeaders(event.headers),
    });

    try {
      // Execute the handler
      const result = await handler(event, context, logger);
      
      const durationMs = Date.now() - startTime;

      // Log successful response
      logApiRequest(
        logger,
        event.httpMethod,
        event.path,
        result.statusCode,
        durationMs
      );

      return result;

    } catch (error) {
      const durationMs = Date.now() - startTime;

      // Handle different error types
      if (error instanceof AppError) {
        // Application error - log and return structured response
        logApiError(
          logger,
          event.httpMethod,
          event.path,
          error,
          error.statusCode
        );

        return createErrorResponse(
          error.statusCode,
          error.type,
          error.message,
          requestId,
          error.details
        );
      }

      // Unknown error - log with full stack trace and return generic error
      const unknownError = error instanceof Error ? error : new Error(String(error));
      
      logger.error(
        'Unhandled error in Lambda function',
        unknownError,
        {
          method: event.httpMethod,
          path: event.path,
          durationMs,
        }
      );

      // Requirement: 29.2 - Return user-friendly error messages to frontend
      return createErrorResponse(
        500,
        ErrorType.INTERNAL_ERROR,
        'An unexpected error occurred. Please try again later.',
        requestId
      );
    }
  };
}

/**
 * Create standardized error response
 * 
 * Requirement: 21.5 - Return structured error responses with appropriate status codes
 */
export function createErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: any
): APIGatewayProxyResult {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(errorResponse),
  };
}

/**
 * Create success response helper
 */
export function createSuccessResponse<T>(
  statusCode: number,
  data: T
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(data),
  };
}

/**
 * Sanitize headers for logging (remove sensitive data)
 */
function sanitizeHeaders(headers: { [key: string]: string | undefined }): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Validation error helper
 */
export function throwValidationError(message: string, details?: any): never {
  throw new AppError(ErrorType.VALIDATION_ERROR, message, 400, details);
}

/**
 * Authentication error helper
 */
export function throwAuthenticationError(message: string = 'Authentication required'): never {
  throw new AppError(ErrorType.AUTHENTICATION_ERROR, message, 401);
}

/**
 * Authorization error helper
 */
export function throwAuthorizationError(message: string = 'Access denied'): never {
  throw new AppError(ErrorType.AUTHORIZATION_ERROR, message, 403);
}

/**
 * Not found error helper
 */
export function throwNotFoundError(resource: string): never {
  throw new AppError(ErrorType.NOT_FOUND, `${resource} not found`, 404);
}

/**
 * Conflict error helper
 */
export function throwConflictError(message: string): never {
  throw new AppError(ErrorType.CONFLICT, message, 409);
}

/**
 * Internal error helper
 */
export function throwInternalError(message: string, details?: any): never {
  throw new AppError(ErrorType.INTERNAL_ERROR, message, 500, details);
}

/**
 * Service unavailable error helper
 */
export function throwServiceUnavailableError(service: string): never {
  throw new AppError(
    ErrorType.SERVICE_UNAVAILABLE,
    `${service} is temporarily unavailable`,
    503
  );
}

/**
 * Parse and validate JSON body
 * 
 * @throws AppError if body is missing or invalid JSON
 */
export function parseJsonBody<T>(body: string | null): T {
  if (!body) {
    throwValidationError('Request body is required');
  }

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throwValidationError('Request body must be valid JSON');
  }
}

/**
 * Extract manufacturerId from JWT token
 * 
 * @throws AppError if token is invalid or manufacturerId is missing
 */
export function extractManufacturerId(event: APIGatewayProxyEvent): string {
  try {
    const claims = event.requestContext.authorizer?.claims;
    
    // Use sub claim (Cognito user ID) as manufacturerId
    if (claims && claims.sub) {
      return claims.sub;
    }

    throwAuthenticationError('Invalid or missing authentication token');
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throwAuthenticationError('Failed to extract manufacturer ID from token');
  }
}

/**
 * Validate required fields in an object
 * 
 * @throws AppError if any required field is missing or empty
 */
export function validateRequiredFields(
  obj: Record<string, any>,
  fields: string[]
): void {
  const missingFields: string[] = [];

  for (const field of fields) {
    const value = obj[field];
    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throwValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }
}

/**
 * Validate numeric range
 * 
 * @throws AppError if value is outside the specified range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value < min || value > max) {
    throwValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      { value, min, max }
    );
  }
}

/**
 * Validate positive number
 * 
 * @throws AppError if value is negative
 */
export function validatePositive(value: number, fieldName: string): void {
  if (value < 0) {
    throwValidationError(`${fieldName} must be non-negative`, { value });
  }
}
