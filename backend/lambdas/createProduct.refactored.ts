/**
 * CreateProduct Lambda Handler (Refactored with Error Handling Middleware)
 * 
 * Creates a new product with structured lifecycle data, calculates carbon footprint,
 * assigns sustainability badge, and stores in DynamoDB.
 * 
 * This is a refactored version demonstrating the use of the error handling middleware.
 * 
 * Requirements: 3.2, 3.1.9, 4.1, 4.3, 4.5, 5.1, 6.1, 21.1, 21.4, 21.5, 29.1, 29.2
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { CarbonCalculator } from '../services/CarbonCalculator';
import { BadgeEngine } from '../services/BadgeEngine';
import { ProductRepository } from '../repositories/ProductRepository';
import {
  CreateProductRequest,
  CreateProductResponse,
  Product,
} from '../../shared/types';
import {
  withErrorHandler,
  createSuccessResponse,
  parseJsonBody,
  extractManufacturerId,
  validateRequiredFields,
  validatePositive,
  throwValidationError,
} from '../middleware/errorHandler';
import { Logger } from '../utils/logger';

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
 * @param context - Lambda context
 * @param logger - Structured logger instance
 * @returns API Gateway response with created product
 */
async function createProductHandler(
  event: APIGatewayProxyEvent,
  _context: Context,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  // Step 1: Parse and validate request body
  const requestBody = parseJsonBody<CreateProductRequest>(event.body);

  logger.debug('Parsed request body', { productName: requestBody.name });

  // Validate required fields
  validateCreateProductRequest(requestBody);

  // Step 2: Extract manufacturerId from JWT token
  const manufacturerId = extractManufacturerId(event);
  logger.info('Creating product for manufacturer', { manufacturerId });

  // Step 3: Validate material percentages sum to 100%
  validateMaterialPercentages(requestBody.lifecycleData.materials);

  // Step 4: Calculate carbon footprint with section breakdown
  logger.debug('Calculating carbon footprint');
  const carbonResult = await carbonCalculator.calculateFootprint(requestBody.lifecycleData);
  logger.info('Carbon footprint calculated', {
    totalCO2: carbonResult.totalCO2,
    breakdown: carbonResult.breakdown,
  });

  // Step 5: Assign badge using BadgeEngine
  const badge = badgeEngine.assignBadge(carbonResult.totalCO2);
  logger.debug('Badge assigned', { badge: badge.name });

  // Step 6: Calculate sustainability score
  const sustainabilityScore = calculateSustainabilityScore(
    carbonResult.totalCO2,
    requestBody.lifecycleData
  );
  logger.debug('Sustainability score calculated', { score: sustainabilityScore });

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
  logger.debug('Storing product in database', { productId });
  await productRepository.createProduct(product);
  logger.info('Product created successfully', { productId });

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

  return createSuccessResponse(201, response);
}

/**
 * Validate CreateProductRequest
 * 
 * Requirements: 3.2, 3.3
 */
function validateCreateProductRequest(request: CreateProductRequest): void {
  // Validate top-level fields
  validateRequiredFields(request, ['name', 'description', 'category', 'lifecycleData']);

  if (!request.lifecycleData.materials || request.lifecycleData.materials.length === 0) {
    throwValidationError('At least one material is required');
  }

  // Validate materials
  for (let i = 0; i < request.lifecycleData.materials.length; i++) {
    const material = request.lifecycleData.materials[i];
    
    if (!material.name || material.name.trim().length === 0) {
      throwValidationError(`Material name is required for material at index ${i}`);
    }
    
    if (material.percentage < 0 || material.percentage > 100) {
      throwValidationError(
        `Material percentage must be between 0 and 100 for material "${material.name}"`,
        { index: i, percentage: material.percentage }
      );
    }
    
    validatePositive(material.weight, `Material weight for "${material.name}"`);
    validatePositive(material.emissionFactor, `Emission factor for "${material.name}"`);
  }

  // Validate manufacturing
  if (!request.lifecycleData.manufacturing) {
    throwValidationError('Manufacturing data is required');
  }
  validateRequiredFields(request.lifecycleData.manufacturing, ['factoryLocation']);
  validatePositive(request.lifecycleData.manufacturing.energyConsumption, 'Energy consumption');
  validatePositive(request.lifecycleData.manufacturing.energyEmissionFactor, 'Energy emission factor');

  // Validate packaging
  if (!request.lifecycleData.packaging) {
    throwValidationError('Packaging data is required');
  }
  validatePositive(request.lifecycleData.packaging.weight, 'Packaging weight');
  validatePositive(request.lifecycleData.packaging.emissionFactor, 'Packaging emission factor');

  // Validate transport
  if (!request.lifecycleData.transport) {
    throwValidationError('Transport data is required');
  }
  validatePositive(request.lifecycleData.transport.distance, 'Transport distance');
  validatePositive(request.lifecycleData.transport.emissionFactorPerKm, 'Transport emission factor');

  // Validate usage
  if (!request.lifecycleData.usage) {
    throwValidationError('Usage data is required');
  }
  validatePositive(request.lifecycleData.usage.avgWashCycles, 'Average wash cycles');
  validatePositive(request.lifecycleData.usage.washTemperature, 'Wash temperature');

  // Validate end of life
  if (!request.lifecycleData.endOfLife) {
    throwValidationError('End of life data is required');
  }
  validatePositive(request.lifecycleData.endOfLife.disposalEmission, 'Disposal emission');
}

/**
 * Validate material percentages sum to 100%
 * 
 * Requirement: 3.1.9
 */
function validateMaterialPercentages(materials: any[]): void {
  const totalPercentage = materials.reduce((sum, material) => sum + material.percentage, 0);
  
  // Allow small floating point tolerance (0.01%)
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throwValidationError(
      `Material percentages must sum to 100%. Current sum: ${totalPercentage.toFixed(2)}%`,
      { totalPercentage, expected: 100 }
    );
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

// Export the wrapped handler
export const handler = withErrorHandler(createProductHandler, 'CreateProduct');
