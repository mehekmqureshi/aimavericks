/**
 * ListProducts Lambda Handler
 * 
 * Lists all products for a manufacturer using GSI query.
 * 
 * Requirements: 17.4, 21.1
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductRepository } from '../repositories/ProductRepository';
import { ErrorResponse } from '../../shared/types';

// Initialize services
const productRepository = new ProductRepository();

/**
 * Lambda handler for listing products by manufacturer
 * 
 * Flow:
 * 1. Extract manufacturerId from JWT token
 * 2. Query products using ProductRepository GSI
 * 3. Return list of products with count
 * 
 * @param event - API Gateway event
 * @returns API Gateway response with list of products
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  
  try {
    // Step 1: Extract manufacturerId from JWT token
    const manufacturerId = extractManufacturerId(event);
    if (!manufacturerId) {
      return createErrorResponse(
        401,
        'UNAUTHORIZED',
        'Invalid or missing authentication token',
        requestId
      );
    }

    console.log(`Listing products for manufacturer: ${manufacturerId}`);

    // Step 2: Query products using ProductRepository GSI
    const products = await productRepository.listProductsByManufacturer(manufacturerId);

    // Step 3: Return list of products with count
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        products,
        count: products.length,
      }),
    };

  } catch (error) {
    console.error('Error listing products:', error);
    
    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An error occurred while listing products',
      requestId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Extract manufacturerId from JWT token in Authorization header
 * 
 * In API Gateway with JWT authorizer, the claims are available in:
 * event.requestContext.authorizer.claims
 */
function extractManufacturerId(event: APIGatewayProxyEvent): string | null {
  try {
    // JWT authorizer puts claims in requestContext.authorizer
    const claims = event.requestContext.authorizer?.claims;
    
    // Use sub claim (Cognito user ID) as manufacturerId
    if (claims && claims.sub) {
      return claims.sub;
    }

    return null;
  } catch (error) {
    console.error('Error extracting manufacturerId:', error);
    return null;
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: any
): APIGatewayProxyResult {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(errorResponse),
  };
}
