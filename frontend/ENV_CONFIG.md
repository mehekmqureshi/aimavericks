# Environment Configuration Guide

## Overview

The frontend application uses Vite's environment variable system to manage configuration across different environments.

## Environment Variables

All environment variables must be prefixed with `VITE_` to be exposed to the client-side code.

### Required Variables

- `VITE_API_GATEWAY_URL`: The base URL for the API Gateway endpoint
- `VITE_COGNITO_REGION`: AWS region for Cognito (e.g., us-east-1)

### Optional Variables

- `VITE_COGNITO_USER_POOL_ID`: Cognito User Pool ID (required for authentication)
- `VITE_COGNITO_CLIENT_ID`: Cognito App Client ID (required for authentication)
- `VITE_ENVIRONMENT`: Environment name (development, staging, production)

## Setup Instructions

### 1. Local Development

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your configuration values:

```env
VITE_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=us-east-1
VITE_ENVIRONMENT=development
```

### 2. Production Deployment

For production deployments, set environment variables in your CI/CD pipeline or hosting platform:

**CloudFront/S3 Deployment:**
- Build the application with production environment variables
- The variables are embedded at build time

```bash
VITE_API_GATEWAY_URL=https://prod-api.example.com \
VITE_COGNITO_USER_POOL_ID=us-east-1_prod123 \
VITE_COGNITO_CLIENT_ID=prodclient123 \
VITE_COGNITO_REGION=us-east-1 \
VITE_ENVIRONMENT=production \
npm run build
```

### 3. Multiple Environments

Create environment-specific files:

- `.env.development` - Development environment
- `.env.staging` - Staging environment
- `.env.production` - Production environment

Vite automatically loads the appropriate file based on the mode:

```bash
npm run dev              # Uses .env.development
npm run build            # Uses .env.production
npm run build -- --mode staging  # Uses .env.staging
```

## Usage in Code

Import the environment configuration:

```typescript
import { env } from './config/env';

// Access configuration
const apiUrl = env.apiGatewayUrl;
const userPoolId = env.cognito.userPoolId;
```

## Security Notes

1. **Never commit `.env` files** - They are gitignored by default
2. **Only commit `.env.example`** - This serves as a template
3. **Environment variables are embedded at build time** - They are visible in the client bundle
4. **Never store secrets** - API keys, passwords, or sensitive data should not be in frontend environment variables
5. **Use backend for sensitive operations** - Authentication tokens and API calls should go through your backend

## Validation

The environment loader (`src/config/env.ts`) automatically validates required variables on startup and logs warnings if any are missing.

## Troubleshooting

### Variables not loading

1. Ensure variables are prefixed with `VITE_`
2. Restart the dev server after changing `.env`
3. Check that `.env` is in the `frontend/` directory
4. Verify the variable name matches exactly (case-sensitive)

### TypeScript errors

If TypeScript doesn't recognize environment variables, ensure `src/vite-env.d.ts` is included in your `tsconfig.json`.

## References

- [Vite Environment Variables Documentation](https://vitejs.dev/guide/env-and-mode.html)
- [AWS Cognito Configuration](https://docs.aws.amazon.com/cognito/latest/developerguide/)
