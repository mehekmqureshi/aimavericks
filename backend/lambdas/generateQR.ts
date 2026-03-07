/**
 * GenerateQR Lambda Handler
 * 
 * Generates batch QR codes with unique serial IDs and digital signatures,
 * stores serial records in DynamoDB, uploads QR images to S3, and returns
 * a signed URL for ZIP download.
 * 
 * Requirements: 8.1, 8.2, 8.5, 9.3, 10.1, 10.2, 10.3, 21.1
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { QRGenerator } from '../services/QRGenerator';
import { SignatureService } from '../services/SignatureService';
import { S3Service } from '../services/S3Service';
import { ProductRepository } from '../repositories/ProductRepository';
import { SerialRepository } from '../repositories/SerialRepository';
import {
  GenerateQRRequest,
  GenerateQRResponse,
  ProductSerial,
  ErrorResponse,
} from '../../shared/types';

// Initialize services
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const signatureService = new SignatureService();
const qrGenerator = new QRGenerator(signatureService);
const s3Service = new S3Service(
  s3Client,
  process.env.QR_CODES_BUCKET_NAME || 'gp-qr-codes-dev'
);
const productRepository = new ProductRepository();
const serialRepository = new SerialRepository();

/**
 * Lambda handler for generating QR codes
 * 
 * Flow:
 * 1. Parse and validate request body (productId, count)
 * 2. Validate count ≤ 1000
 * 3. Retrieve product data
 * 4. Generate batch of QR codes using QRGenerator
 * 5. Store serial records using SerialRepository
 * 6. Upload QR images to S3 and create ZIP
 * 7. Generate signed URL for ZIP download
 * 8. Return serial IDs and ZIP URL
 * 
 * @param event - API Gateway event with QR generation request
 * @returns API Gateway response with serial IDs and ZIP URL
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const startTime = Date.now();
  
  try {
    // Step 1: Parse and validate request body
    if (!event.body) {
      return createErrorResponse(400, 'MISSING_BODY', 'Request body is required', requestId);
    }

    let requestBody: GenerateQRRequest;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON', requestId);
    }

    // Validate required fields
    const validationError = validateGenerateQRRequest(requestBody);
    if (validationError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', validationError, requestId);
    }

    // Step 2: Validate count ≤ 1000
    if (requestBody.count > 1000) {
      return createErrorResponse(
        400,
        'VALIDATION_ERROR',
        'Batch count cannot exceed 1000',
        requestId
      );
    }

    if (requestBody.count < 1) {
      return createErrorResponse(
        400,
        'VALIDATION_ERROR',
        'Batch count must be at least 1',
        requestId
      );
    }

    // Extract manufacturerId from JWT token
    const manufacturerId = extractManufacturerId(event);
    if (!manufacturerId) {
      return createErrorResponse(
        401,
        'UNAUTHORIZED',
        'Invalid or missing authentication token',
        requestId
      );
    }

    // Step 3: Retrieve product data
    const product = await productRepository.getProduct(requestBody.productId);
    if (!product) {
      return createErrorResponse(
        404,
        'PRODUCT_NOT_FOUND',
        `Product ${requestBody.productId} not found`,
        requestId
      );
    }

    // Verify the product belongs to the authenticated manufacturer
    if (product.manufacturerId !== manufacturerId) {
      return createErrorResponse(
        403,
        'FORBIDDEN',
        'You do not have permission to generate QR codes for this product',
        requestId
      );
    }

    // Step 4: Generate batch of QR codes using QRGenerator
    console.log(`Generating ${requestBody.count} QR codes for product ${requestBody.productId}`);
    
    // Prepare material summary from lifecycle data
    const materialSummary = product.lifecycleData.materials
      .map(m => `${m.name} ${m.percentage}%`)
      .join(', ');
    
    // Extract color from product name or description if available
    const colorMatch = (product.name + ' ' + product.description).match(/\b(black|white|blue|red|green|yellow|gray|grey|brown|pink|purple|orange|beige|navy|khaki)\b/i);
    const color = colorMatch ? colorMatch[0] : undefined;
    
    const qrBatchResult = await qrGenerator.generateBatch(
      requestBody.productId,
      requestBody.count,
      manufacturerId,
      product.carbonFootprint,
      {
        productName: product.name,
        category: product.category,
        color,
        materialSummary,
        ecoScore: product.badge.name,
      }
    );

    // Step 5: Store serial records using SerialRepository
    console.log(`Storing ${qrBatchResult.serialIds.length} serial records in DynamoDB`);
    const now = new Date().toISOString();
    const serialRecords: ProductSerial[] = [];

    for (let i = 0; i < qrBatchResult.serialIds.length; i++) {
      const serialId = qrBatchResult.serialIds[i];
      
      // Generate digital signature for this serial with all data
      const digitalSignature = signatureService.generateSignature({
        productId: requestBody.productId,
        serialId,
        manufacturerId,
        carbonFootprint: product.carbonFootprint,
        productName: product.name,
        category: product.category,
        color,
        materialSummary,
        ecoScore: product.badge.name,
      });

      const serialRecord: ProductSerial = {
        serialId,
        productId: requestBody.productId,
        manufacturerId,
        digitalSignature,
        qrCodeUrl: '', // Will be updated after S3 upload
        generatedAt: now,
        scannedCount: 0,
      };

      serialRecords.push(serialRecord);
    }

    // Store all serial records in parallel
    await Promise.all(
      serialRecords.map(serial => serialRepository.createSerial(serial))
    );

    // Step 6: Upload QR images to S3 and create ZIP
    console.log(`Uploading QR codes to S3 and creating ZIP archive`);
    const { zipUrl, expiresAt } = await s3Service.uploadQRBatch(
      manufacturerId,
      requestBody.productId,
      qrBatchResult.serialIds,
      qrBatchResult.qrImages
    );

    // Step 7: Generate signed URL for ZIP download (already done in uploadQRBatch)
    
    // Step 8: Return serial IDs and ZIP URL
    const response: GenerateQRResponse = {
      serialIds: qrBatchResult.serialIds,
      zipUrl,
      expiresAt: expiresAt.toISOString(),
    };

    const executionTime = Date.now() - startTime;
    console.log(`QR generation completed in ${executionTime}ms`);

    // Verify execution time requirement (5 seconds for N ≤ 1000)
    if (executionTime > 5000 && requestBody.count <= 1000) {
      console.warn(`QR generation took ${executionTime}ms, exceeding 5 second requirement`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Error generating QR codes:', error);
    
    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An error occurred while generating QR codes',
      requestId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Validate GenerateQRRequest
 * 
 * Requirements: 8.1, 8.2, 8.5
 */
function validateGenerateQRRequest(request: GenerateQRRequest): string | null {
  if (!request.productId || request.productId.trim().length === 0) {
    return 'Product ID is required';
  }

  if (typeof request.count !== 'number') {
    return 'Count must be a number';
  }

  if (!Number.isInteger(request.count)) {
    return 'Count must be an integer';
  }

  if (request.count < 1) {
    return 'Count must be at least 1';
  }

  if (request.count > 1000) {
    return 'Count cannot exceed 1000';
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
