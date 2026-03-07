# Error Handling Middleware

This directory contains the error handling middleware for Lambda functions, providing consistent error handling, logging, and response formatting across the Green Passport platform.

## Overview

The error handling middleware provides:

- **Automatic try-catch wrapping** for Lambda handlers
- **Structured error logging** to CloudWatch with stack traces
- **User-friendly error responses** with consistent format
- **Request/response logging** with performance timing
- **Helper functions** for common validation and error scenarios

## Requirements

- **21.4**: Log errors to CloudWatch with stack trace
- **21.5**: Return structured error responses with appropriate status codes
- **29.1**: Comprehensive error handling for all Lambda functions
- **29.2**: User-friendly error messages to frontend
- **29.3**: Log all API requests with timestamp, endpoint, and response status
- **29.4**: Structured logging with consistent format

## Usage

### Basic Usage

Wrap your Lambda handler with the `withErrorHandler` function:

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { withErrorHandler, createSuccessResponse } from '../middleware/errorHandler';
import { Logger } from '../utils/logger';

async function myHandler(
  event: APIGatewayProxyEvent,
  context: Context,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  logger.info('Processing request');
  
  // Your handler logic here
  const result = { message: 'Success' };
  
  return createSuccessResponse(200, result);
}

export const handler = withErrorHandler(myHandler, 'MyFunctionName');
```

### Using Helper Functions

The middleware provides several helper functions for common scenarios:

#### Parse JSON Body

```typescript
import { parseJsonBody } from '../middleware/errorHandler';

const requestBody = parseJsonBody<MyRequestType>(event.body);
// Automatically throws validation error if body is missing or invalid JSON
```

#### Extract Manufacturer ID

```typescript
import { extractManufacturerId } from '../middleware/errorHandler';

const manufacturerId = extractManufacturerId(event);
// Automatically throws authentication error if token is invalid
```

#### Validate Required Fields

```typescript
import { validateRequiredFields } from '../middleware/errorHandler';

validateRequiredFields(requestBody, ['name', 'email', 'category']);
// Throws validation error if any field is missing
```

#### Validate Numeric Values

```typescript
import { validateRange, validatePositive } from '../middleware/errorHandler';

validateRange(age, 0, 120, 'Age');
validatePositive(weight, 'Weight');
// Throws validation error if validation fails
```

### Throwing Custom Errors

Use the error helper functions to throw specific error types:

```typescript
import {
  throwValidationError,
  throwAuthenticationError,
  throwAuthorizationError,
  throwNotFoundError,
  throwConflictError,
  throwInternalError,
  throwServiceUnavailableError,
} from '../middleware/errorHandler';

// Validation error (400)
throwValidationError('Invalid email format', { email: 'invalid@' });

// Authentication error (401)
throwAuthenticationError('Invalid credentials');

// Authorization error (403)
throwAuthorizationError('Insufficient permissions');

// Not found error (404)
throwNotFoundError('Product');

// Conflict error (409)
throwConflictError('Product already exists');

// Internal error (500)
throwInternalError('Database connection failed');

// Service unavailable (503)
throwServiceUnavailableError('AI Service');
```

### Using AppError Directly

For custom error scenarios:

```typescript
import { AppError, ErrorType } from '../middleware/errorHandler';

throw new AppError(
  ErrorType.VALIDATION_ERROR,
  'Custom validation message',
  400,
  { field: 'email', reason: 'invalid format' }
);
```

## Error Response Format

All errors are returned in a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Material percentages must sum to 100%",
    "details": {
      "totalPercentage": 95,
      "expected": 100
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "abc123-def456-ghi789"
  }
}
```

## Success Response Format

Use `createSuccessResponse` for consistent success responses:

```typescript
import { createSuccessResponse } from '../middleware/errorHandler';

return createSuccessResponse(200, {
  productId: 'PROD-123',
  name: 'Organic T-Shirt',
  carbonFootprint: 3.5
});
```

Response format:

```json
{
  "productId": "PROD-123",
  "name": "Organic T-Shirt",
  "carbonFootprint": 3.5
}
```

## Logging

The middleware automatically logs:

- **Incoming requests** with method, path, query params, and sanitized headers
- **Successful responses** with status code and duration
- **Errors** with full stack trace and context

Use the logger instance passed to your handler:

```typescript
async function myHandler(
  event: APIGatewayProxyEvent,
  context: Context,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  logger.debug('Debug message', { detail: 'value' });
  logger.info('Info message', { userId: '123' });
  logger.warn('Warning message', { threshold: 100 });
  logger.error('Error message', error, { context: 'data' });
  
  // ...
}
```

## Error Types

The following error types are available:

| Error Type | Status Code | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `BAD_REQUEST` | 400 | Malformed request |
| `AUTHENTICATION_ERROR` | 401 | Authentication required or failed |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | External service unavailable |

## Migration Guide

To migrate existing Lambda functions to use the error handling middleware:

### Before

```typescript
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Handler logic
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
```

### After

```typescript
import { withErrorHandler, createSuccessResponse } from '../middleware/errorHandler';
import { Logger } from '../utils/logger';

async function myHandler(
  event: APIGatewayProxyEvent,
  context: Context,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  // Handler logic
  logger.info('Processing request');
  
  return createSuccessResponse(200, result);
}

export const handler = withErrorHandler(myHandler, 'MyFunctionName');
```

## Example

See `backend/lambdas/createProduct.refactored.ts` for a complete example of a Lambda function using the error handling middleware.

## Best Practices

1. **Always use the wrapper**: Wrap all Lambda handlers with `withErrorHandler`
2. **Use helper functions**: Leverage validation and error helpers for consistency
3. **Log appropriately**: Use the correct log level (DEBUG, INFO, WARN, ERROR)
4. **Provide context**: Include relevant metadata in log messages
5. **User-friendly messages**: Throw errors with clear, actionable messages
6. **Include details**: Add details object for debugging without exposing sensitive data
7. **Don't catch unnecessarily**: Let the middleware handle errors unless you need custom logic

## Testing

When testing Lambda functions with the middleware:

```typescript
import { handler } from './myLambda';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

const mockEvent = {
  body: JSON.stringify({ name: 'Test' }),
  requestContext: { requestId: 'test-123' },
  // ... other required fields
} as APIGatewayProxyEvent;

const mockContext = {} as Context;

const result = await handler(mockEvent, mockContext);
expect(result.statusCode).toBe(200);
```

## CloudWatch Logs

Logs are automatically sent to CloudWatch in structured JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "ERROR",
  "message": "Validation error",
  "context": {
    "requestId": "abc123",
    "functionName": "CreateProduct",
    "manufacturerId": "MFG-001"
  },
  "error": {
    "name": "AppError",
    "message": "Material percentages must sum to 100%",
    "stack": "..."
  },
  "metadata": {
    "totalPercentage": 95
  }
}
```

## Environment Variables

- `LOG_LEVEL`: Set minimum log level (DEBUG, INFO, WARN, ERROR). Default: INFO

## Related Files

- `backend/utils/logger.ts` - Structured logging utility
- `backend/lambdas/createProduct.refactored.ts` - Example implementation
- `shared/types.ts` - Type definitions including ErrorResponse
