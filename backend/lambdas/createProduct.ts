/**
 * CreateProduct Lambda Handler
 * 
 * Creates a new product with structured lifecycle data, calculates carbon footprint,
 * assigns sustainability badge, and stores in DynamoDB.
 * 
 * Requirements: 3.2, 3.1.9, 4.1, 4.3, 4.5, 5.1, 6.1, 21.1
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { CarbonCalculator } from '../services/CarbonCalculator';
import { BadgeEngine } from '../services/BadgeEngine';
import { ProductRepository } from '../repositories/ProductRepository';
import {
  CreateProductRequest,
  CreateProductResponse,
  Product,
  ErrorResponse,
} from '../../shared/types';

// Initialize services
const carbonCalculator = new CarbonCalculator();
const badgeEngine = new BadgeEngine();
const productRepository = new ProductRepository();

/**
 * Lambda handler for creating a product
 * 
 * Flow:
 * 1. Parse and validate request body with structured lifecycle data
 * 2. Extract manufacturerId from JWT token
 * 3. Validate material percentages sum to 100%
 * 4. Calculate carbon footprint with section breakdown using CarbonCalculator
 * 5. Assign badge using BadgeEngine
 * 6. Calculate sustainability score
 * 7. Store product with carbonBreakdown using ProductRepository
 * 8. Return product with carbon metrics and breakdown
 * 
 * @param event - API Gateway event with product data
 * @returns API Gateway response with created product
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  
  try {
    // Step 1: Parse and validate request body
    if (!event.body) {
      return createErrorResponse(400, 'MISSING_BODY', 'Request body is required', requestId);
    }

    let requestBody: CreateProductRequest;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON', requestId);
    }

    // Validate required fields
    const validationError = validateCreateProductRequest(requestBody);
    if (validationError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validationError, requestId);
    }

    // Step 2: Extract manufacturerId from JWT token
    const manufacturerId = extractManufacturerId(event);
    if (!manufacturerId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid or missing authentication token', requestId);
    }

    // Step 3: Validate material percentages sum to 100%
    const materialPercentageError = validateMaterialPercentages(requestBody.lifecycleData.materials);
    if (materialPercentageError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', materialPercentageError, requestId);
    }

    // Step 4: Calculate carbon footprint with section breakdown
    const carbonResult = await carbonCalculator.calculateFootprint(requestBody.lifecycleData);

    // Step 5: Assign badge using BadgeEngine
    const badge = badgeEngine.assignBadge(carbonResult.totalCO2);

    // Step 6: Calculate sustainability score
    const sustainabilityScore = calculateSustainabilityScore(
      carbonResult.totalCO2,
      requestBody.lifecycleData
    );

    // Step 7: Create product entity
    const productId = `PROD-${uuidv4()}`;
    const now = new Date().toISOString();

    const product: Product = {
      productId,
      manufacturerId,
      name: requestBody.name,
      description: requestBody.description,
      category: requestBody.category,
      lifecycleData: requestBody.lifecycleData,
      carbonFootprint: carbonResult.totalCO2,
      carbonBreakdown: carbonResult.breakdown,
      sustainabilityScore,
      badge,
      predictionSource: carbonResult.predictionSource,
      confidenceScore: carbonResult.confidenceScore,
      createdAt: now,
      updatedAt: now,
    };

    // Store product in DynamoDB
    await productRepository.createProduct(product);

    // Step 8: Return response with carbon metrics
    const response: CreateProductResponse = {
      productId: product.productId,
      carbonFootprint: product.carbonFootprint,
      carbonBreakdown: product.carbonBreakdown,
      sustainabilityScore: product.sustainabilityScore,
      badge: product.badge,
      createdAt: product.createdAt,
      predictionSource: product.predictionSource,
      confidenceScore: product.confidenceScore,
    };

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Error creating product:', error);
    
    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An error occurred while creating the product',
      requestId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Validate CreateProductRequest
 * 
 * Requirements: 3.2, 3.3
 */
function validateCreateProductRequest(request: CreateProductRequest): string | null {
  if (!request.name || request.name.trim().length === 0) {
    return 'Product name is required';
  }

  if (!request.description || request.description.trim().length === 0) {
    return 'Product description is required';
  }

  if (!request.category || request.category.trim().length === 0) {
    return 'Product category is required';
  }

  if (!request.lifecycleData) {
    return 'Lifecycle data is required';
  }

  // Validate materials
  if (!request.lifecycleData.materials || request.lifecycleData.materials.length === 0) {
    return 'At least one material is required';
  }

  for (const material of request.lifecycleData.materials) {
    if (!material.name || material.name.trim().length === 0) {
      return 'Material name is required for all materials';
    }
    if (material.percentage < 0 || material.percentage > 100) {
      return 'Material percentage must be between 0 and 100';
    }
    if (material.weight < 0) {
      return 'Material weight must be non-negative';
    }
    if (material.emissionFactor < 0) {
      return 'Material emission factor must be non-negative';
    }
  }

  // Validate manufacturing
  if (!request.lifecycleData.manufacturing) {
    return 'Manufacturing data is required';
  }
  if (!request.lifecycleData.manufacturing.factoryLocation || 
      request.lifecycleData.manufacturing.factoryLocation.trim().length === 0) {
    return 'Factory location is required';
  }
  if (request.lifecycleData.manufacturing.energyConsumption < 0) {
    return 'Energy consumption must be non-negative';
  }
  if (request.lifecycleData.manufacturing.energyEmissionFactor < 0) {
    return 'Energy emission factor must be non-negative';
  }

  // Validate packaging
  if (!request.lifecycleData.packaging) {
    return 'Packaging data is required';
  }
  if (request.lifecycleData.packaging.weight < 0) {
    return 'Packaging weight must be non-negative';
  }
  if (request.lifecycleData.packaging.emissionFactor < 0) {
    return 'Packaging emission factor must be non-negative';
  }

  // Validate transport
  if (!request.lifecycleData.transport) {
    return 'Transport data is required';
  }
  if (request.lifecycleData.transport.distance < 0) {
    return 'Transport distance must be non-negative';
  }
  if (request.lifecycleData.transport.emissionFactorPerKm < 0) {
    return 'Transport emission factor must be non-negative';
  }

  // Validate usage
  if (!request.lifecycleData.usage) {
    return 'Usage data is required';
  }
  if (request.lifecycleData.usage.avgWashCycles < 0) {
    return 'Average wash cycles must be non-negative';
  }
  if (request.lifecycleData.usage.washTemperature < 0) {
    return 'Wash temperature must be non-negative';
  }

  // Validate end of life
  if (!request.lifecycleData.endOfLife) {
    return 'End of life data is required';
  }
  if (request.lifecycleData.endOfLife.disposalEmission < 0) {
    return 'Disposal emission must be non-negative';
  }

  return null;
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
 * Requirement: 6.1
 */
function calculateSustainabilityScore(
  carbonFootprint: number,
  lifecycleData: any
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
