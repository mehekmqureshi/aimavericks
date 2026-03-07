/**
 * Lambda Function: CalculateEmission (Real-time)
 * 
 * Provides real-time carbon emission calculations for individual lifecycle sections
 * as users enter data in the Lifecycle_Form. This enables the Emission_Preview
 * sidebar to display live emission updates.
 * 
 * Requirements: 3.1.6, 3.2.8, 3.3.6, 3.4.6, 3.5.5, 3.6.5
 * 
 * Performance: Must respond within 50ms for real-time UX
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CarbonCalculator } from '../services/CarbonCalculator';
import {
  Material_Row,
  Manufacturing_Data,
  Packaging_Data,
  Transport_Data,
  Usage_Data,
  EndOfLife_Data,
  CalculateEmissionRequest,
  CalculateEmissionResponse,
} from '../../shared/types';

// Initialize CarbonCalculator (reused across warm Lambda invocations)
const calculator = new CarbonCalculator({
  useSageMaker: false, // Disable ML for real-time calculations (too slow)
  fallbackOnError: true,
});

/**
 * Lambda handler for real-time emission calculations
 * 
 * Accepts section type and section data, returns calculated emission
 * for that section plus a running total breakdown.
 * 
 * @param event - API Gateway event with request body
 * @returns API Gateway response with emission calculation
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'MISSING_BODY',
            message: 'Request body is required',
            timestamp: new Date().toISOString(),
            requestId: event.requestContext.requestId,
          },
        }),
      };
    }

    const request: CalculateEmissionRequest = JSON.parse(event.body);

    // Validate request
    if (!request.section || !request.data) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Both section and data fields are required',
            timestamp: new Date().toISOString(),
            requestId: event.requestContext.requestId,
          },
        }),
      };
    }

    // Calculate section emission based on section type
    let sectionEmission = 0;

    switch (request.section) {
      case 'materials':
        sectionEmission = calculateMaterialsSection(request.data);
        break;

      case 'manufacturing':
        sectionEmission = calculator.calculateManufacturingEmission(
          request.data as Manufacturing_Data
        );
        break;

      case 'packaging':
        sectionEmission = calculator.calculatePackagingEmission(
          request.data as Packaging_Data
        );
        break;

      case 'transport':
        sectionEmission = calculator.calculateTransportEmission(
          request.data as Transport_Data
        );
        break;

      case 'usage':
        sectionEmission = calculator.calculateUsageEmission(
          request.data as Usage_Data
        );
        break;

      case 'endOfLife':
        sectionEmission = calculator.calculateDisposalEmission(
          request.data as EndOfLife_Data
        );
        break;

      default:
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: {
              code: 'INVALID_SECTION',
              message: `Invalid section type: ${request.section}. Must be one of: materials, manufacturing, packaging, transport, usage, endOfLife`,
              timestamp: new Date().toISOString(),
              requestId: event.requestContext.requestId,
            },
          }),
        };
    }

    // Build breakdown (only include the calculated section)
    const breakdown = {
      materials: request.section === 'materials' ? sectionEmission : 0,
      manufacturing: request.section === 'manufacturing' ? sectionEmission : 0,
      packaging: request.section === 'packaging' ? sectionEmission : 0,
      transport: request.section === 'transport' ? sectionEmission : 0,
      usage: request.section === 'usage' ? sectionEmission : 0,
      disposal: request.section === 'endOfLife' ? sectionEmission : 0,
    };

    // Calculate total (in real-time scenario, this is just the section emission)
    const totalCO2 = sectionEmission;

    const response: CalculateEmissionResponse = {
      sectionEmission: roundToDecimal(sectionEmission, 3),
      totalCO2: roundToDecimal(totalCO2, 3),
      breakdown,
    };

    // Check performance requirement (50ms)
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > 50) {
      console.warn(
        `Real-time calculation exceeded 50ms target: ${elapsedTime}ms for section ${request.section}`
      );
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Calculation-Time-Ms': elapsedTime.toString(),
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error calculating emission:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'CALCULATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          requestId: event.requestContext.requestId,
        },
      }),
    };
  }
};

/**
 * Calculate total emissions for materials section
 * 
 * Handles both single material and array of materials
 * 
 * @param data - Material_Row or Material_Row[]
 * @returns Total materials emission
 */
function calculateMaterialsSection(data: any): number {
  // Handle single material
  if (!Array.isArray(data)) {
    const material = data as Material_Row;
    return calculator.calculateMaterialEmission(material);
  }

  // Handle array of materials
  const materials = data as Material_Row[];
  let total = 0;

  for (const material of materials) {
    total += calculator.calculateMaterialEmission(material);
  }

  return total;
}

/**
 * Round number to specified decimal places
 * 
 * @param value - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
function roundToDecimal(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
