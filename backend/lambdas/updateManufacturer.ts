/**
 * Lambda Function: UpdateManufacturer
 * 
 * Updates manufacturer profile information.
 * Validates that the requesting user is authorized to update the manufacturer.
 * 
 * Requirements: 2.2, 2.3, 21.1
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ManufacturerRepository } from '../repositories/ManufacturerRepository';
import type { Manufacturer, ErrorResponse } from '../../shared/types';

const manufacturerRepo = new ManufacturerRepository();

/**
 * Update manufacturer request interface
 */
interface UpdateManufacturerRequest {
  name?: string;
  location?: string;
  certifications?: string[];
  contactEmail?: string;
}

/**
 * Extract manufacturerId from JWT token claims
 */
const getManufacturerIdFromToken = (event: APIGatewayProxyEvent): string | null => {
  const claims = event.requestContext.authorizer?.claims;
  // Use sub claim (Cognito user ID) as manufacturerId
  return claims?.sub || null;
};

/**
 * Handler function
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    console.log('UpdateManufacturer Lambda invoked', {
      path: event.path,
      manufacturerId: event.pathParameters?.manufacturerId,
      requestId,
    });

    // Extract manufacturerId from path parameters
    const manufacturerId = event.pathParameters?.manufacturerId;

    if (!manufacturerId) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'MISSING_PARAMETER',
          message: 'manufacturerId is required',
          timestamp: new Date().toISOString(),
          requestId,
        },
      };

      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(errorResponse),
      };
    }

    // Verify authorization - user can only update their own manufacturer profile
    const tokenManufacturerId = getManufacturerIdFromToken(event);
    
    if (!tokenManufacturerId || tokenManufacturerId !== manufacturerId) {
      console.warn('Unauthorized manufacturer update attempt', {
        requestedManufacturerId: manufacturerId,
        tokenManufacturerId,
        requestId,
      });

      const errorResponse: ErrorResponse = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'You are not authorized to update this manufacturer profile',
          timestamp: new Date().toISOString(),
          requestId,
        },
      };

      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(errorResponse),
      };
    }

    // Parse request body
    if (!event.body) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'MISSING_BODY',
          message: 'Request body is required',
          timestamp: new Date().toISOString(),
          requestId,
        },
      };

      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(errorResponse),
      };
    }

    const updates: UpdateManufacturerRequest = JSON.parse(event.body);

    // Validate updates
    const validationErrors: string[] = [];

    if (updates.name !== undefined && !updates.name.trim()) {
      validationErrors.push('Manufacturer name cannot be empty');
    }

    if (updates.location !== undefined && !updates.location.trim()) {
      validationErrors.push('Location cannot be empty');
    }

    if (updates.contactEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.contactEmail)) {
        validationErrors.push('Invalid email address format');
      }
    }

    if (updates.certifications !== undefined) {
      if (!Array.isArray(updates.certifications)) {
        validationErrors.push('Certifications must be an array');
      } else {
        const invalidCerts = updates.certifications.filter(
          cert => typeof cert !== 'string' || !cert.trim()
        );
        if (invalidCerts.length > 0) {
          validationErrors.push('All certifications must be non-empty strings');
        }
      }
    }

    if (validationErrors.length > 0) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: validationErrors,
          timestamp: new Date().toISOString(),
          requestId,
        },
      };

      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(errorResponse),
      };
    }

    // Update manufacturer in database
    const updatedManufacturer = await manufacturerRepo.updateManufacturer(
      manufacturerId,
      updates as Partial<Manufacturer>
    );

    console.log('Manufacturer updated successfully', {
      manufacturerId: updatedManufacturer.manufacturerId,
      updatedFields: Object.keys(updates),
      requestId,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(updatedManufacturer),
    };
  } catch (error) {
    console.error('Error in UpdateManufacturer Lambda', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(errorResponse),
    };
  }
};
