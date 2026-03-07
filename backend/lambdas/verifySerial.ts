/**
 * VerifySerial Lambda Handler
 * 
 * Verifies QR code authenticity by validating digital signatures
 * and retrieves product information for consumer display.
 * 
 * Requirements: 11.3, 11.4, 11.5, 13.1, 13.3, 13.4, 21.1
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { VerificationService } from '../services/VerificationService';
import { SerialRepository } from '../repositories/SerialRepository';
import { ErrorResponse } from '../../shared/types';

// Initialize services
const serialRepository = new SerialRepository();
const verificationService = new VerificationService();

/**
 * Lambda handler for verifying a serial ID
 * 
 * Flow:
 * 1. Parse serialId from path parameters
 * 2. Use VerificationService to verify serial
 * 3. Retrieve product and manufacturer data
 * 4. Update scan statistics (scannedCount, lastScannedAt)
 * 5. Return verification result with product data
 * 
 * @param event - API Gateway event with serialId in path parameters
 * @returns API Gateway response with verification result
 * 
 * Requirements:
 * - 11.3: Extract Serial_ID from QR code scan
 * - 11.4: Retrieve associated product and manufacturer data
 * - 11.5: Display "Product not found" for invalid Serial_ID
 * - 13.1: Retrieve stored Digital_Signature
 * - 13.3: Display "Verified" status when signatures match
 * - 13.4: Display "Verification Failed" when signatures don't match
 * - 21.1: Lambda function handles business logic
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const startTime = Date.now();
  
  try {
    // Step 1: Parse serialId from path parameters
    const serialId = event.pathParameters?.serialId;
    
    if (!serialId || serialId.trim().length === 0) {
      return createErrorResponse(
        400,
        'MISSING_SERIAL_ID',
        'Serial ID is required',
        requestId
      );
    }

    console.log(`Verifying serial: ${serialId}`);

    // Step 2: Use VerificationService to verify serial
    // Step 3: Retrieve product and manufacturer data (handled by VerificationService)
    const verificationResult = await verificationService.verifySerial(serialId);

    // Check if serial was found
    if (verificationResult.error === 'Serial ID not found') {
      return createErrorResponse(
        404,
        'SERIAL_NOT_FOUND',
        'Product not found',
        requestId
      );
    }

    // Check if product or manufacturer data is missing
    if (verificationResult.error && 
        (verificationResult.error.includes('Product not found') || 
         verificationResult.error.includes('Manufacturer not found'))) {
      return createErrorResponse(
        404,
        'PRODUCT_NOT_FOUND',
        'Product not found',
        requestId
      );
    }

    // Step 4: Update scan statistics (scannedCount, lastScannedAt)
    if (verificationResult.verified && verificationResult.serial) {
      try {
        await serialRepository.updateScanStatistics(serialId);
        console.log(`Updated scan statistics for serial: ${serialId}`);
      } catch (error) {
        // Log error but don't fail the verification
        console.error('Error updating scan statistics:', error);
      }
    }

    // Step 5: Return verification result with product data
    const elapsedTime = Date.now() - startTime;
    console.log(`Verification completed in ${elapsedTime}ms`);

    // Requirement 13.5: Complete verification within 200ms
    if (elapsedTime > 200) {
      console.warn(`Verification took ${elapsedTime}ms, exceeding 200ms target`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        verified: verificationResult.verified,
        product: verificationResult.product,
        manufacturer: verificationResult.manufacturer,
        serial: verificationResult.serial,
        message: verificationResult.verified 
          ? 'Verified' 
          : 'Verification Failed',
        error: verificationResult.error,
      }),
    };

  } catch (error) {
    console.error('Error verifying serial:', error);
    
    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An error occurred while verifying the serial',
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
