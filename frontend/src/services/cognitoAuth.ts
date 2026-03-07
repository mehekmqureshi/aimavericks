/**
 * AWS Cognito Authentication Service
 * 
 * Handles authentication with AWS Cognito User Pools
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { env } from '../config/env';
import type { AuthResult } from '../../../shared/types';

// Initialize Cognito User Pool
const userPool = new CognitoUserPool({
  UserPoolId: env.cognito.userPoolId,
  ClientId: env.cognito.clientId,
});

/**
 * Login with email and password
 */
export const cognitoLogin = (email: string, password: string): Promise<AuthResult> => {
  return new Promise((resolve, reject) => {
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session: CognitoUserSession) => {
        const idToken = session.getIdToken();
        const refreshToken = session.getRefreshToken();

        // Use sub (Cognito user ID) as manufacturerId since custom attribute doesn't exist
        const manufacturerId = idToken.payload.sub;

        // IMPORTANT: Use ID token for API Gateway authentication, not access token
        const authResult: AuthResult = {
          accessToken: idToken.getJwtToken(),  // ID token for API Gateway Cognito authorizer
          refreshToken: refreshToken.getToken(),
          expiresIn: idToken.getExpiration() - Math.floor(Date.now() / 1000),
          manufacturerId,
        };

        resolve(authResult);
      },
      onFailure: (err) => {
        reject(new Error(err.message || 'Authentication failed'));
      },
    });
  });
};

/**
 * Refresh access token using refresh token
 */
export const cognitoRefreshToken = (email: string): Promise<AuthResult> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        reject(err || new Error('Failed to get session'));
        return;
      }

      if (session.isValid()) {
        const idToken = session.getIdToken();
        const refreshToken = session.getRefreshToken();

        // Use sub (Cognito user ID) as manufacturerId
        const manufacturerId = idToken.payload.sub;

        // IMPORTANT: Use ID token for API Gateway authentication, not access token
        const authResult: AuthResult = {
          accessToken: idToken.getJwtToken(),  // ID token for API Gateway Cognito authorizer
          refreshToken: refreshToken.getToken(),
          expiresIn: idToken.getExpiration() - Math.floor(Date.now() / 1000),
          manufacturerId,
        };

        resolve(authResult);
      } else {
        reject(new Error('Session is not valid'));
      }
    });
  });
};

/**
 * Logout current user
 */
export const cognitoLogout = (): void => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): CognitoUser | null => {
  return userPool.getCurrentUser();
};

/**
 * Get current session
 */
export const getCurrentSession = (): Promise<CognitoUserSession> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();
    
    if (!cognitoUser) {
      reject(new Error('No current user'));
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        reject(err || new Error('Failed to get session'));
        return;
      }

      resolve(session);
    });
  });
};
