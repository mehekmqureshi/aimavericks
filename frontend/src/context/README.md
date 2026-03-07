# Authentication Context

This directory contains the authentication context and related utilities for the Green Passport platform.

## Overview

The authentication system provides:
- JWT token-based authentication
- Automatic token refresh before expiry
- Secure token storage in localStorage
- React context for global auth state
- Automatic retry of failed requests after token refresh

## Components

### AuthContext.tsx

The main authentication context that manages:
- Login/logout functionality
- JWT token storage and retrieval
- Automatic token refresh (5 minutes before expiry)
- Authentication state management

## Usage

### 1. Wrap Your App with AuthProvider

```tsx
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### 2. Use the useAuth Hook

```tsx
import { useAuth } from './hooks';

function LoginPage() {
  const { login, isLoading, error } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      // Redirect to dashboard
    } catch (err) {
      // Error is available in context
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* Login form */}
    </form>
  );
}
```

### 3. Check Authentication Status

```tsx
import { useAuth } from './hooks';

function ProtectedComponent() {
  const { isAuthenticated, isLoading, manufacturerId } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return <div>Welcome, {manufacturerId}</div>;
}
```

### 4. Logout

```tsx
import { useAuth } from './hooks';

function Header() {
  const { logout } = useAuth();

  return (
    <button onClick={logout}>Logout</button>
  );
}
```

## Token Storage

Tokens are stored in localStorage with the following keys:
- `gp_access_token` - JWT access token
- `gp_refresh_token` - Refresh token for obtaining new access tokens
- `gp_manufacturer_id` - Manufacturer ID from authentication
- `gp_token_expiry` - Token expiry timestamp

## Automatic Token Refresh

The context automatically:
1. Checks token expiry on mount
2. Refreshes token if it expires within 5 minutes
3. Sets up an interval to check expiry every minute
4. Refreshes token before it expires

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage. For production, consider using httpOnly cookies for enhanced security.
2. **Token Expiry**: Tokens are refreshed 5 minutes before expiry to prevent authentication failures.
3. **Logout on Failure**: If token refresh fails, the user is automatically logged out.
4. **HTTPS Only**: Always use HTTPS in production to protect tokens in transit.

## Integration with API Client

The authentication context works seamlessly with the API client:
- API client automatically adds Authorization header
- API client handles 401 errors and triggers token refresh
- Failed requests are retried after successful token refresh

## Requirements

Implements requirements:
- **1.2**: Manufacturer authentication with JWT tokens
- **1.3**: JWT token validation on API requests

## Future Enhancements

- [ ] Integrate with AWS Cognito SDK for production authentication
- [ ] Add biometric authentication support
- [ ] Implement remember me functionality
- [ ] Add session timeout warnings
- [ ] Support for multiple authentication providers
