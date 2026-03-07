/**
 * CORS Headers Utility
 * Provides consistent CORS headers across all Lambda functions
 */

/**
 * Standard CORS headers for all API responses
 */
export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Max-Age': '3600',
};

/**
 * Get CORS headers for successful responses
 */
export function getSuccessHeaders(): Record<string, string> {
  return { ...CORS_HEADERS };
}

/**
 * Get CORS headers for error responses
 */
export function getErrorHeaders(): Record<string, string> {
  return { ...CORS_HEADERS };
}
