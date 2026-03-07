/**
 * API Client Service
 * 
 * Axios instance with interceptors for authentication and error handling.
 * Automatically adds JWT token to requests and handles token refresh on 401.
 * 
 * Requirements: 1.3, 20.3
 */

import axios, { type AxiosInstance, AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { env } from '../config/env';
import type { ErrorResponse } from '../../../shared/types';

// ============================================================================
// Constants
// ============================================================================

const TOKEN_STORAGE_KEY = 'gp_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'gp_refresh_token';
const MANUFACTURER_ID_STORAGE_KEY = 'gp_manufacturer_id';
const TOKEN_EXPIRY_STORAGE_KEY = 'gp_token_expiry';

// ============================================================================
// API Client Instance
// ============================================================================

/**
 * Create axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiGatewayUrl,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Request Interceptor
// ============================================================================

/**
 * Add Authorization header with JWT token to all requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor
// ============================================================================

/**
 * Track if we're currently refreshing the token to avoid multiple refresh attempts
 */
let isRefreshing = false;

/**
 * Queue of failed requests waiting for token refresh
 */
let failedRequestsQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  failedRequestsQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  
  failedRequestsQueue = [];
};

/**
 * Refresh the access token
 */
const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // TODO: Replace with actual Cognito token refresh
    // For now, this is a placeholder that will be replaced with AWS Cognito SDK
    const response = await axios.post(`${env.apiGatewayUrl}/auth/refresh`, {
      refreshToken,
    });

    const { accessToken, expiresIn, manufacturerId } = response.data;
    const expiryTime = Date.now() + expiresIn * 1000;

    // Store new tokens
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(MANUFACTURER_ID_STORAGE_KEY, manufacturerId);
    localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiryTime.toString());

    return accessToken;
  } catch (error) {
    // Clear auth data on refresh failure
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(MANUFACTURER_ID_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
    
    throw error;
  }
};

/**
 * Handle responses and errors
 * Automatically refresh token on 401 and retry failed requests
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Log detailed error information for debugging
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('API Error Request (no response):', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
    } else {
      console.error('API Error:', error.message);
    }

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        
        // Update the failed request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        // Process queued requests
        processQueue(null, newToken);
        
        isRefreshing = false;

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        isRefreshing = false;

        // Redirect to login page or emit logout event
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract error message from API error response
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse>;
    
    if (axiosError.response?.data?.error?.message) {
      return axiosError.response.data.error.message;
    }
    
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return !error.response && error.code === 'ERR_NETWORK';
  }
  return false;
};

/**
 * Check if error is a timeout error
 */
export const isTimeoutError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return error.code === 'ECONNABORTED';
  }
  return false;
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 401 || error.response?.status === 403;
  }
  return false;
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 400;
  }
  return false;
};

// ============================================================================
// Export
// ============================================================================

export default apiClient;
