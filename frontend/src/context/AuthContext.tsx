/**
 * Authentication Context
 * 
 * Provides authentication state and methods to the application.
 * Manages JWT tokens, login/logout, and token refresh.
 * 
 * Requirements: 1.2, 1.3
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthResult } from '../../../shared/types';
import { cognitoLogin, cognitoLogout, getCurrentSession } from '../services/cognitoAuth';

// ============================================================================
// Types
// ============================================================================

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  manufacturerId: string | null;
  accessToken: string | null;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const TOKEN_STORAGE_KEY = 'gp_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'gp_refresh_token';
const MANUFACTURER_ID_STORAGE_KEY = 'gp_manufacturer_id';
const TOKEN_EXPIRY_STORAGE_KEY = 'gp_token_expiry';

// Refresh token 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    manufacturerId: null,
    accessToken: null,
    error: null,
  });

  /**
   * Store authentication data in localStorage
   */
  const storeAuthData = useCallback((authResult: AuthResult) => {
    const expiryTime = Date.now() + authResult.expiresIn * 1000;
    
    localStorage.setItem(TOKEN_STORAGE_KEY, authResult.accessToken);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, authResult.refreshToken);
    localStorage.setItem(MANUFACTURER_ID_STORAGE_KEY, authResult.manufacturerId);
    localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiryTime.toString());

    setState({
      isAuthenticated: true,
      isLoading: false,
      manufacturerId: authResult.manufacturerId,
      accessToken: authResult.accessToken,
      error: null,
    });
  }, []);

  /**
   * Clear authentication data from localStorage
   */
  const clearAuthData = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(MANUFACTURER_ID_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);

    setState({
      isAuthenticated: false,
      isLoading: false,
      manufacturerId: null,
      accessToken: null,
      error: null,
    });
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use AWS Cognito for authentication
      const authResult = await cognitoLogin(email, password);
      
      // Store email for token refresh
      localStorage.setItem('gp_user_email', email);
      
      storeAuthData(authResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [storeAuthData]);

  /**
   * Logout and clear authentication data
   */
  const logout = useCallback(() => {
    cognitoLogout();
    localStorage.removeItem('gp_user_email');
    clearAuthData();
  }, [clearAuthData]);

  /**
   * Refresh the access token using the refresh token
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      // Get current session from Cognito (automatically refreshes if needed)
      const session = await getCurrentSession();
      
      const idToken = session.getIdToken();
      const refreshToken = session.getRefreshToken();
      const manufacturerId = idToken.payload.sub;

      // IMPORTANT: Use ID token for API Gateway authentication, not access token
      const authResult: AuthResult = {
        accessToken: idToken.getJwtToken(),  // ID token for API Gateway Cognito authorizer
        refreshToken: refreshToken.getToken(),
        expiresIn: idToken.getExpiration() - Math.floor(Date.now() / 1000),
        manufacturerId,
      };

      storeAuthData(authResult);
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuthData();
    }
  }, [storeAuthData, clearAuthData]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Check if token is expired or about to expire
   */
  const isTokenExpiringSoon = useCallback((): boolean => {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY);
    if (!expiryTime) return true;

    const expiryTimestamp = parseInt(expiryTime, 10);
    const now = Date.now();
    
    return now >= expiryTimestamp - REFRESH_BUFFER_MS;
  }, []);

  /**
   * Initialize authentication state from localStorage
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const manufacturerId = localStorage.getItem(MANUFACTURER_ID_STORAGE_KEY);

      if (!accessToken || !manufacturerId) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          manufacturerId: null,
          accessToken: null,
          error: null,
        });
        return;
      }

      // Check if token is expired or expiring soon
      if (isTokenExpiringSoon()) {
        await refreshToken();
      } else {
        setState({
          isAuthenticated: true,
          isLoading: false,
          manufacturerId,
          accessToken,
          error: null,
        });
      }
    };

    initializeAuth();
  }, [isTokenExpiringSoon, refreshToken]);

  /**
   * Set up automatic token refresh
   */
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const checkTokenExpiry = () => {
      if (isTokenExpiringSoon()) {
        refreshToken();
      }
    };

    // Check every minute
    const intervalId = setInterval(checkTokenExpiry, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [state.isAuthenticated, isTokenExpiringSoon, refreshToken]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access authentication context
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Export context for testing purposes
export { AuthContext };
