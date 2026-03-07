/**
 * UpdateProduct Lambda Handler
 * 
 * Updates an existing product with partial lifecycle data updates,
 * recalculates carbon footprint and sustainability metrics.
 * 
 * Requirements: 4.4, 6.4, 17.7, 21.1
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CarbonCalculator } from '../services/CarbonCalculator';
import { BadgeEngine } from '../services/BadgeEngine';
import { ProductRepository } from '../repositories/ProductRepository';
import {
  UpdateProductRequest,
  Product,
  ErrorResponse,
  LifecycleData,
} from '../../shared/types';

// Initialize services
const carbonCalculator = new CarbonCalculator();
const badgeEngine = new BadgeEngine();
const productRepository = new ProductRepository();

/**
 * Lambda handler for updating a product
 * 
 * Flow:
 * 1. Parse productId and updates from request
 * 2. Validate manufacturerId matches JWT token
 * 3. Retrieve existing product
 * 4. Support partial lifecycle section updates
 * 5. Recalculate affected section emissions if lifecycle data changed
 * 6. Recalculate total carbon footprint and breakdown
 * 7. Recalculate sustainability score if lifecycle data changed
 * 8. Update product using ProductRepository
 * 9. Return updated product with new carbon metrics
 * 
 * @param event - API Gateway event with productId and update data
 * @returns API Gateway response with updated product
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

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'MISSING_BODY', 'Request body is required', requestId);
    }

    let requestBody: UpdateProductRequest;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON', requestId);
    }

    // Step 2: Extract and validate manufacturerId from JWT token
    const manufacturerId = extractManufacturerId(event);
    if (!manufacturerId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid or missing authentication token', requestId);
    }

    // Step 3: Retrieve existing product
    console.log(`Retrieving product: ${productId}`);
    const existingProduct = await productRepository.getProduct(productId);

    if (!existingProduct) {
      return createErrorResponse(
        404,
        'PRODUCT_NOT_FOUND',
        `Product ${productId} not found`,
        requestId
      );
    }

    // Validate manufacturerId matches
    if (existingProduct.manufacturerId !== manufacturerId) {
      return createErrorResponse(
        403,
        'FORBIDDEN',
        'You do not have permission to update this product',
        requestId
      );
    }

    // Step 4: Support partial lifecycle section updates
    const updatedLifecycleData = mergeLifecycleData(
      existingProduct.lifecycleData,
      requestBody.lifecycleData
    );

    // Validate material percentages if materials were updated
    if (requestBody.lifecycleData?.materials) {
      const materialPercentageError = validateMaterialPercentages(updatedLifecycleData.materials);
      if (materialPercentageError) {
        return createErrorResponse(400, 'VALIDATION_ERROR', materialPercentageError, requestId);
      }
    }

    // Step 5-6: Recalculate carbon footprint if lifecycle data changed
    let carbonFootprint = existingProduct.carbonFootprint;
    let carbonBreakdown = existingProduct.carbonBreakdown;
    let sustainabilityScore = existingProduct.sustainabilityScore;
    let badge = existingProduct.badge;
    let predictionSource = existingProduct.predictionSource;
    let confidenceScore = existingProduct.confidenceScore;

    const lifecycleDataChanged = requestBody.lifecycleData !== undefined;

    if (lifecycleDataChanged) {
      console.log('Lifecycle data changed, recalculating carbon footprint');
      
      // Recalculate carbon footprint with section breakdown
      const carbonResult = await carbonCalculator.calculateFootprint(updatedLifecycleData);
      carbonFootprint = carbonResult.totalCO2;
      carbonBreakdown = carbonResult.breakdown;
      predictionSource = carbonResult.predictionSource;
      confidenceScore = carbonResult.confidenceScore;

      // Recalculate badge based on new carbon footprint
      badge = badgeEngine.assignBadge(carbonFootprint);

      // Step 7: Recalculate sustainability score
      sustainabilityScore = calculateSustainabilityScore(
        carbonFootprint,
        updatedLifecycleData
      );
    }

    // Step 8: Build update object
    const updates: Partial<Product> = {
      ...requestBody,
      lifecycleData: updatedLifecycleData,
      carbonFootprint,
      carbonBreakdown,
      sustainabilityScore,
      badge,
      predictionSource,
      confidenceScore,
    };

    // Update product in DynamoDB
    const updatedProduct = await productRepository.updateProduct(productId, updates);

    // Step 9: Return updated product
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(updatedProduct),
    };

  } catch (error) {
    console.error('Error updating product:', error);
    
    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An error occurred while updating the product',
      requestId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Merge existing lifecycle data with partial updates
 * Supports updating individual sections without overwriting entire lifecycle data
 * 
 * Requirement: 17.7
 */
function mergeLifecycleData(
  existing: LifecycleData,
  updates?: Partial<LifecycleData>
): LifecycleData {
  if (!updates) {
    return existing;
  }

  return {
    materials: updates.materials ?? existing.materials,
    manufacturing: updates.manufacturing 
      ? { ...existing.manufacturing, ...updates.manufacturing }
      : existing.manufacturing,
    packaging: updates.packaging
      ? { ...existing.packaging, ...updates.packaging }
      : existing.packaging,
    transport: updates.transport
      ? { ...existing.transport, ...updates.transport }
      : existing.transport,
    usage: updates.usage
      ? { ...existing.usage, ...updates.usage }
      : existing.usage,
    endOfLife: updates.endOfLife
      ? { ...existing.endOfLife, ...updates.endOfLife }
      : existing.endOfLife,
  };
}

/**
 * Validate material percentages sum to 100%
 * 
 * Requirement: 3.1.9
 */
function validateMaterialPercentages(materials: any[]): string | null {
  const totalPercentage = materials.reduce((sum, material) => sum + material.percentage, 0);
  
  // Allow small floating point tolerance (0.01%)
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return `Material percentages must sum to 100%. Current sum: ${totalPercentage.toFixed(2)}%`;
  }

  return null;
}

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
 * Calculate sustainability score (0-100 scale)
 * 
 * Score calculation logic:
 * - Base score: 100
 * - Deduct points based on carbon footprint (higher carbon = lower score)
 * - Bonus points for recycled materials, recyclable packaging, take-back programs
 * 
 * Requirement: 6.1, 6.4
 */
function calculateSustainabilityScore(
  carbonFootprint: number,
  lifecycleData: LifecycleData
): number {
  let score = 100;

  // Deduct points based on carbon footprint
  // 0-4 kg: -0 to -20 points
  // 4-7 kg: -20 to -40 points
  // 7+ kg: -40 to -80 points
  if (carbonFootprint < 4) {
    score -= (carbonFootprint / 4) * 20;
  } else if (carbonFootprint <= 7) {
    score -= 20 + ((carbonFootprint - 4) / 3) * 20;
  } else {
    score -= 40 + Math.min(((carbonFootprint - 7) / 10) * 40, 40);
  }

  // Bonus for recycled materials
  const recycledMaterialsCount = lifecycleData.materials.filter((m: any) => m.recycled).length;
  const recycledBonus = (recycledMaterialsCount / lifecycleData.materials.length) * 10;
  score += recycledBonus;

  // Bonus for recyclable packaging
  if (lifecycleData.packaging.recyclable) {
    score += 5;
  }

  // Bonus for end-of-life features
  if (lifecycleData.endOfLife.recyclable) {
    score += 3;
  }
  if (lifecycleData.endOfLife.biodegradable) {
    score += 3;
  }
  if (lifecycleData.endOfLife.takebackProgram) {
    score += 4;
  }

  // Ensure score is within 0-100 range
  score = Math.max(0, Math.min(100, score));

  return Math.round(score);
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
