import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AIService } from '../services/AIService';
import { ErrorResponse } from '../../shared/types';

const aiService = new AIService(process.env.AWS_REGION || 'us-east-1');

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  
  try {
    if (!event.body) {
      return createErrorResponse(400, 'MISSING_BODY', 'Request body is required', requestId);
    }

    let requestBody: any;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON', requestId);
    }

    const manufacturerId = extractManufacturerId(event);
    if (!manufacturerId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid or missing authentication token', requestId);
    }

    let generatedContent: string;

    if (requestBody.productName && requestBody.category) {
      const productData = {
        name: requestBody.productName,
        category: requestBody.category,
        materials: requestBody.materials || [],
        manufacturingProcess: requestBody.manufacturingProcess || 'Standard manufacturing',
      };

      generatedContent = await aiService.generateDescription(productData);

    } else if (requestBody.lifecycleData && requestBody.carbonFootprint !== undefined) {
      generatedContent = await aiService.generateInsights(
        requestBody.lifecycleData,
        requestBody.carbonFootprint
      );

    } else {
      return createErrorResponse(
        400,
        'INVALID_REQUEST',
        'Request must include either (productName + category) or (lifecycleData + carbonFootprint)',
        requestId
      );
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Max-Age': '3600',
      },
      body: JSON.stringify({
        generatedContent,
        timestamp: new Date().toISOString(),
      }),
    };

  } catch (error) {
    console.error('Error generating AI content:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return createErrorResponse(504, 'AI_TIMEOUT', 'AI service timeout - please try again', requestId);
      }
      if (error.message.includes('Circuit breaker is OPEN')) {
        return createErrorResponse(503, 'SERVICE_UNAVAILABLE', 'AI service temporarily unavailable - please try again later', requestId);
      }
    }
    
    return createErrorResponse(500, 'INTERNAL_ERROR', 'An error occurred while generating content', requestId, error instanceof Error ? error.message : 'Unknown error');
  }
};

function extractManufacturerId(event: APIGatewayProxyEvent): string | null {
  try {
    const claims = event.requestContext.authorizer?.claims;
    if (claims && claims.sub) {
      return claims.sub;
    }
    return null;
  } catch (error) {
    console.error('Error extracting manufacturerId:', error);
    return null;
  }
}

function createErrorResponse(statusCode: number, code: string, message: string, requestId: string, details?: any): APIGatewayProxyResult {
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
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Max-Age': '3600',
    },
    body: JSON.stringify(errorResponse),
  };
}
