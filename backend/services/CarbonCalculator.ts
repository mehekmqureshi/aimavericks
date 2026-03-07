/**
 * Carbon Calculator Service
 * 
 * Hybrid ML-based carbon prediction with deterministic fallback.
 * Primary: AWS SageMaker real-time inference endpoint
 * Fallback: Formula-based calculation
 * 
 * Architecture: Lambda → SageMaker Endpoint → Return prediction
 * Fallback: If SageMaker fails, use deterministic formula
 * 
 * Requirements: 4.1, 3.1.5, 3.2.7, 3.3.5, 3.4.5, 3.5.4, 3.6.5
 */

import {
  LifecycleData,
  Material_Row,
  Manufacturing_Data,
  Packaging_Data,
  Transport_Data,
  Usage_Data,
  EndOfLife_Data,
  CarbonFootprintResult,
  SageMakerInferenceRequest,
  SageMakerInferenceResponse,
  CarbonCalculatorConfig,
} from '../../shared/types';

// AWS SDK imports (will be installed)
import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';

/**
 * CarbonCalculator class with ML-based prediction and deterministic fallback
 */
export class CarbonCalculator {
  private sagemakerClient: SageMakerRuntimeClient;
  private config: CarbonCalculatorConfig;

  constructor(config?: Partial<CarbonCalculatorConfig>) {
    // Default configuration
    this.config = {
      useSageMaker: config?.useSageMaker ?? true,
      sagemakerEndpointName: config?.sagemakerEndpointName ?? process.env.SAGEMAKER_ENDPOINT_NAME,
      fallbackOnError: config?.fallbackOnError ?? true,
      timeoutMs: config?.timeoutMs ?? 200,
    };

    // Initialize SageMaker client
    this.sagemakerClient = new SageMakerRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Calculate total carbon footprint using hybrid ML + deterministic approach
   * 
   * Flow:
   * 1. Calculate section emissions using deterministic formulas
   * 2. Attempt ML prediction via SageMaker
   * 3. If ML fails, use deterministic total
   * 4. Return result with prediction source
   * 
   * @param lifecycleData - Complete lifecycle data structure
   * @returns CarbonFootprintResult with total, breakdown, and prediction metadata
   */
  async calculateFootprint(lifecycleData: LifecycleData): Promise<CarbonFootprintResult> {
    // Step 1: Calculate section emissions deterministically (always needed for breakdown)
    const materialsEmission = this.calculateMaterialsTotal(lifecycleData.materials);
    const manufacturingEmission = this.calculateManufacturingEmission(lifecycleData.manufacturing);
    const packagingEmission = this.calculatePackagingEmission(lifecycleData.packaging);
    const transportEmission = this.calculateTransportEmission(lifecycleData.transport);
    const usageEmission = this.calculateUsageEmission(lifecycleData.usage);
    const disposalEmission = this.calculateDisposalEmission(lifecycleData.endOfLife);

    const breakdown = {
      materials: this.roundToDecimal(materialsEmission, 3),
      manufacturing: this.roundToDecimal(manufacturingEmission, 3),
      packaging: this.roundToDecimal(packagingEmission, 3),
      transport: this.roundToDecimal(transportEmission, 3),
      usage: this.roundToDecimal(usageEmission, 3),
      disposal: this.roundToDecimal(disposalEmission, 3),
    };

    // Step 2: Attempt ML prediction if enabled
    if (this.config.useSageMaker && this.config.sagemakerEndpointName) {
      try {
        const mlResult = await this.predictWithSageMaker({
          materialEmission: breakdown.materials,
          manufacturingEmission: breakdown.manufacturing,
          packagingEmission: breakdown.packaging,
          transportEmission: breakdown.transport,
          usageEmission: breakdown.usage,
          disposalEmission: breakdown.disposal,
        });

        // Return ML prediction
        return {
          totalCO2: this.roundToDecimal(mlResult.predictedCarbon, 3),
          breakdown,
          predictionSource: 'ML',
          confidenceScore: mlResult.confidenceScore,
        };
      } catch (error) {
        // Log ML failure
        console.warn('SageMaker prediction failed, falling back to deterministic calculation:', error);
        
        if (!this.config.fallbackOnError) {
          throw error;
        }
      }
    }

    // Step 3: Fallback to deterministic calculation
    const totalCO2 = 
      breakdown.materials +
      breakdown.manufacturing +
      breakdown.packaging +
      breakdown.transport +
      breakdown.usage +
      breakdown.disposal;

    return {
      totalCO2: this.roundToDecimal(totalCO2, 3),
      breakdown,
      predictionSource: 'Fallback',
      confidenceScore: 1.0, // Deterministic calculation has 100% confidence
    };
  }

  /**
   * Invoke SageMaker real-time inference endpoint
   * 
   * @param request - Inference request with section emissions
   * @returns ML prediction with confidence score
   * @throws Error if SageMaker invocation fails
   */
  private async predictWithSageMaker(
    request: SageMakerInferenceRequest
  ): Promise<SageMakerInferenceResponse> {
    if (!this.config.sagemakerEndpointName) {
      throw new Error('SageMaker endpoint name not configured');
    }

    const command = new InvokeEndpointCommand({
      EndpointName: this.config.sagemakerEndpointName,
      ContentType: 'application/json',
      Accept: 'application/json',
      Body: JSON.stringify(request),
    });

    // Set timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('SageMaker invocation timeout')), this.config.timeoutMs);
    });

    const invocationPromise = this.sagemakerClient.send(command);

    const response = await Promise.race([invocationPromise, timeoutPromise]);

    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.Body));
    
    return {
      predictedCarbon: responseBody.predictedCarbon || responseBody.prediction,
      confidenceScore: responseBody.confidenceScore || responseBody.confidence || 0.95,
    };
  }

  /**
   * Calculate emission for a single material row
   * 
   * Formula: Material_Emission = weight × emissionFactor
   * 
   * @param material - Material row with weight and emission factor
   * @returns Calculated emission in kg CO2
   */
  calculateMaterialEmission(material: Material_Row): number {
    const emission = material.weight * material.emissionFactor;
    return this.roundToDecimal(emission, 3);
  }

  /**
   * Calculate total emissions from all materials
   * 
   * @param materials - Array of material rows
   * @returns Sum of all material emissions
   */
  private calculateMaterialsTotal(materials: Material_Row[]): number {
    if (!materials || materials.length === 0) {
      return 0;
    }

    const total = materials.reduce((sum, material) => {
      return sum + (material.weight * material.emissionFactor);
    }, 0);

    return total;
  }

  /**
   * Calculate manufacturing emission
   * 
   * Formula: Manufacturing_Emission = energyConsumption × energyEmissionFactor
   * 
   * @param data - Manufacturing data with energy consumption
   * @returns Calculated emission in kg CO2
   */
  calculateManufacturingEmission(data: Manufacturing_Data): number {
    const emission = data.energyConsumption * data.energyEmissionFactor;
    return this.roundToDecimal(emission, 3);
  }

  /**
   * Calculate packaging emission
   * 
   * Formula: Packaging_Emission = weight × emissionFactor
   * 
   * @param data - Packaging data with weight and emission factor
   * @returns Calculated emission in kg CO2
   */
  calculatePackagingEmission(data: Packaging_Data): number {
    const emission = data.weight * data.emissionFactor;
    return this.roundToDecimal(emission, 3);
  }

  /**
   * Calculate transport emission
   * 
   * Formula: Transport_Emission = distance × emissionFactorPerKm
   * 
   * @param data - Transport data with distance and emission factor
   * @returns Calculated emission in kg CO2
   */
  calculateTransportEmission(data: Transport_Data): number {
    const emission = data.distance * data.emissionFactorPerKm;
    return this.roundToDecimal(emission, 3);
  }

  /**
   * Calculate usage phase emission
   * 
   * Formula: Usage_Emission = f(avgWashCycles, washTemperature, dryerUse)
   * 
   * Estimation logic:
   * - Base emission per wash cycle: 0.15 kg CO2 at 30°C
   * - Temperature adjustment: +0.01 kg CO2 per 10°C above 30°C
   * - Dryer usage adds: 0.5 kg CO2 per cycle
   * 
   * @param data - Usage data with wash cycles, temperature, and dryer use
   * @returns Calculated emission in kg CO2
   */
  calculateUsageEmission(data: Usage_Data): number {
    const baseEmissionPerWash = 0.15; // kg CO2 at 30°C
    const tempAdjustment = Math.max(0, (data.washTemperature - 30) / 10) * 0.01;
    const dryerEmissionPerCycle = data.dryerUse ? 0.5 : 0;

    const emissionPerWash = baseEmissionPerWash + tempAdjustment + dryerEmissionPerCycle;
    const totalEmission = data.avgWashCycles * emissionPerWash;

    return this.roundToDecimal(totalEmission, 3);
  }

  /**
   * Calculate end-of-life disposal emission
   * 
   * @param data - End of life data with disposal emission
   * @returns Disposal emission in kg CO2
   */
  calculateDisposalEmission(data: EndOfLife_Data): number {
    return this.roundToDecimal(data.disposalEmission, 3);
  }

  /**
   * Round number to specified decimal places
   * 
   * @param value - Number to round
   * @param decimals - Number of decimal places
   * @returns Rounded number
   */
  private roundToDecimal(value: number, decimals: number): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }
}
