/**
 * Environment Variable Loader
 * 
 * Loads and validates environment variables for the frontend application.
 * Uses Vite's import.meta.env for accessing environment variables.
 */

interface EnvironmentConfig {
  apiGatewayUrl: string;
  cognito: {
    userPoolId: string;
    clientId: string;
    region: string;
  };
  environment: 'development' | 'staging' | 'production';
}

/**
 * Validates that required environment variables are present
 */
function validateEnv(): void {
  const required = [
    'VITE_API_GATEWAY_URL',
    'VITE_COGNITO_REGION',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    console.warn(
      `Missing environment variables: ${missing.join(', ')}. ` +
      'Some features may not work correctly.'
    );
  }
}

/**
 * Loads environment configuration from Vite environment variables
 */
function loadEnvironmentConfig(): EnvironmentConfig {
  validateEnv();

  return {
    apiGatewayUrl: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000',
    cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
    },
    environment: (import.meta.env.VITE_ENVIRONMENT || 'development') as 'development' | 'staging' | 'production',
  };
}

// Export singleton configuration
export const env = loadEnvironmentConfig();

// Export type for use in other modules
export type { EnvironmentConfig };
