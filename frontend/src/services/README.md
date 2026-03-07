# API Client Service

This directory contains the API client and related utilities for making HTTP requests to the Green Passport backend.

## Overview

The API client provides:
- Axios instance configured for the Green Passport API
- Automatic JWT token injection in request headers
- Automatic token refresh on 401 errors
- Request/response interceptors for error handling
- Helper functions for error classification

## Components

### apiClient.ts

The main API client that provides:
- Pre-configured axios instance with base URL
- Request interceptor to add Authorization header
- Response interceptor to handle 401 errors and refresh tokens
- Error handling utilities

## Usage

### 1. Basic GET Request

```tsx
import apiClient from './services/apiClient';

const fetchProducts = async () => {
  try {
    const response = await apiClient.get('/products');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch products:', error);
  }
};
```

### 2. POST Request with Data

```tsx
import apiClient from './services/apiClient';

const createProduct = async (productData) => {
  try {
    const response = await apiClient.post('/products', productData);
    return response.data;
  } catch (error) {
    console.error('Failed to create product:', error);
  }
};
```

### 3. PUT Request for Updates

```tsx
import apiClient from './services/apiClient';

const updateProduct = async (productId, updates) => {
  try {
    const response = await apiClient.put(`/products/${productId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Failed to update product:', error);
  }
};
```

### 4. Error Handling with Helper Functions

```tsx
import apiClient, { 
  getErrorMessage, 
  isNetworkError, 
  isAuthError,
  isValidationError 
} from './services/apiClient';

const fetchData = async () => {
  try {
    const response = await apiClient.get('/products');
    return response.data;
  } catch (error) {
    if (isNetworkError(error)) {
      console.error('Network error - check your connection');
    } else if (isAuthError(error)) {
      console.error('Authentication error - please log in');
    } else if (isValidationError(error)) {
      console.error('Validation error:', getErrorMessage(error));
    } else {
      console.error('Error:', getErrorMessage(error));
    }
  }
};
```

## Automatic Token Refresh

The API client automatically handles token refresh:

1. When a request receives a 401 response
2. The interceptor catches the error
3. Attempts to refresh the token using the refresh token
4. Retries the original request with the new token
5. If refresh fails, emits an 'auth:logout' event

### Handling Logout Events

```tsx
useEffect(() => {
  const handleLogout = () => {
    // Redirect to login page
    window.location.href = '/login';
  };

  window.addEventListener('auth:logout', handleLogout);

  return () => {
    window.removeEventListener('auth:logout', handleLogout);
  };
}, []);
```

## Request Queue During Token Refresh

When multiple requests fail with 401 simultaneously:
1. Only one token refresh is triggered
2. Other failed requests are queued
3. After successful refresh, all queued requests are retried
4. If refresh fails, all queued requests are rejected

## Error Helper Functions

### getErrorMessage(error)
Extracts a user-friendly error message from any error type.

```tsx
const message = getErrorMessage(error);
// Returns: "Product not found" or "Network error" etc.
```

### isNetworkError(error)
Checks if the error is a network connectivity issue.

```tsx
if (isNetworkError(error)) {
  showNotification('Please check your internet connection');
}
```

### isTimeoutError(error)
Checks if the request timed out.

```tsx
if (isTimeoutError(error)) {
  showNotification('Request timed out - please try again');
}
```

### isAuthError(error)
Checks if the error is authentication-related (401 or 403).

```tsx
if (isAuthError(error)) {
  redirectToLogin();
}
```

### isValidationError(error)
Checks if the error is a validation error (400).

```tsx
if (isValidationError(error)) {
  showValidationErrors(getErrorMessage(error));
}
```

## Configuration

The API client is configured with:
- **Base URL**: From environment variable `VITE_API_GATEWAY_URL`
- **Timeout**: 30 seconds
- **Headers**: Content-Type: application/json

## Environment Variables

Required environment variables:
- `VITE_API_GATEWAY_URL` - Base URL for the API Gateway

## Integration with AuthContext

The API client works seamlessly with AuthContext:
- Reads tokens from localStorage (same keys as AuthContext)
- Automatically adds Authorization header to all requests
- Handles token refresh using the same refresh endpoint
- Updates localStorage with new tokens after refresh

## Requirements

Implements requirements:
- **1.3**: JWT token validation on API requests
- **20.3**: API Gateway JWT authorizer integration

## Security Considerations

1. **Token Storage**: Tokens are read from localStorage
2. **HTTPS Only**: Always use HTTPS in production
3. **Token Refresh**: Automatic refresh prevents token expiry during user sessions
4. **Error Handling**: Sensitive error details are not exposed to users

## Future Enhancements

- [ ] Add request retry logic for network errors
- [ ] Implement request caching for GET requests
- [ ] Add request/response logging in development mode
- [ ] Support for file uploads with progress tracking
- [ ] Add request cancellation support
- [ ] Implement rate limiting on client side
