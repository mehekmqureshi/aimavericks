/**
 * Lambda Function: GetManufacturer
 * 
 * Retrieves manufacturer profile information by manufacturerId.
 * 
 * Requirements: 2.1, 21.1
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ManufacturerRepository } from '../repositories/ManufacturerRepository';
import { ErrorResponse } from '../../shared/types';

const manufacturerRepo = new ManufacturerRepository();

/**
 * Handler function
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    console.log('GetManufacturer Lambda invoked', {
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

    // Retrieve manufacturer from database
    const manufacturer = await manufacturerRepo.getManufacturer(manufacturerId);

    if (!manufacturer) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'MANUFACTURER_NOT_FOUND',
          message: `Manufacturer ${manufacturerId} not found`,
          timestamp: new Date().toISOString(),
          requestId,
        },
      };

      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(errorResponse),
      };
    }

    console.log('Manufacturer retrieved successfully', {
      manufacturerId: manufacturer.manufacturerId,
      requestId,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(manufacturer),
    };
  } catch (error) {
    console.error('Error in GetManufacturer Lambda', {
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
