/**
 * GetDraft Lambda Handler
 * 
 * Retrieves a saved draft by draftId with authorization check.
 * Ensures only the manufacturer who created the draft can retrieve it.
 * 
 * Requirements: 3.1.6
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ErrorResponse } from '../../shared/types';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const DRAFTS_TABLE = process.env.DRAFTS_TABLE || 'Drafts';

/**
 * Lambda handler for retrieving a draft
 * 
 * Flow:
 * 1. Parse draftId from path parameters
 * 2. Retrieve draft data from DynamoDB
 * 3. Validate manufacturerId matches JWT token
 * 4. Return draft data with all saved fields
 * 
 * @param event - API Gateway event with draftId in path
 * @returns API Gateway response with draft data
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  
  try {
    // Step 1: Parse draftId from path parameters
    const draftId = event.pathParameters?.draftId;
    
    if (!draftId) {
      return createErrorResponse(400, 'MISSING_DRAFT_ID', 'Draft ID is required', requestId);
    }

    // Extract manufacturerId from JWT token
    const manufacturerId = extractManufacturerId(event);
    if (!manufacturerId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid or missing authentication token', requestId);
    }

    // Step 2: Retrieve draft data from DynamoDB
    const result = await docClient.send(new GetCommand({
      TableName: DRAFTS_TABLE,
      Key: { draftId },
    }));

    if (!result.Item) {
      return createErrorResponse(404, 'DRAFT_NOT_FOUND', 'Draft not found', requestId);
    }

    // Step 3: Validate manufacturerId matches JWT token
    if (result.Item.manufacturerId !== manufacturerId) {
      return createErrorResponse(
        403,
        'FORBIDDEN',
        'You do not have permission to access this draft',
        requestId
      );
    }

    // Step 4: Return draft data with all saved fields
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result.Item),
    };

  } catch (error) {
    console.error('Error retrieving draft:', error);
    
    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An error occurred while retrieving the draft',
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
