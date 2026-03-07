/**
 * GetProduct Lambda Handler
 * 
 * Retrieves a product by productId from DynamoDB.
 * 
 * Requirements: 21.1
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductRepository } from '../repositories/ProductRepository';
import { ErrorResponse } from '../../shared/types';

// Initialize services
const productRepository = new ProductRepository();

/**
 * Lambda handler for retrieving a product
 * 
 * Flow:
 * 1. Parse productId from path parameters
 * 2. Retrieve product using ProductRepository
 * 3. Return product data or 404 if not found
 * 
 * @param event - API Gateway event with productId in path parameters
 * @returns API Gateway response with product data or 404
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  
  try {
    // Step 1: Parse productId from path parameters
    const productId = event.pathParameters?.productId;
    
    if (!productId || productId.trim().length === 0) {
      return createErrorResponse(
        400,
        'MISSING_PRODUCT_ID',
        'Product ID is required',
        requestId
      );
    }

    // Step 2: Retrieve product using ProductRepository
    console.log(`Retrieving product: ${productId}`);
    const product = await productRepository.getProduct(productId);

    // Step 3: Return product data or 404 if not found
    if (!product) {
      return createErrorResponse(
        404,
        'PRODUCT_NOT_FOUND',
        `Product ${productId} not found`,
        requestId
      );
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(product),
    };

  } catch (error) {
    console.error('Error retrieving product:', error);
    
    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An error occurred while retrieving the product',
      requestId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

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
