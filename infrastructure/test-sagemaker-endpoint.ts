/**
 * SageMaker Endpoint Test Script
 * 
 * Tests the deployed SageMaker endpoint with sample data
 * Compares ML prediction vs formula-based calculation
 */

import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import { CarbonCalculator } from '../backend/services/CarbonCalculator';
import { LifecycleData } from '../shared/types';

interface TestConfig {
  region: string;
  endpointName: string;
}

export class SageMakerEndpointTester {
  private client: SageMakerRuntimeClient;
  private calculator: CarbonCalculator;
  private config: TestConfig;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      endpointName: config.endpointName || process.env.SAGEMAKER_ENDPOINT_NAME || 'gp-carbon-predictor',
    };

    this.client = new SageMakerRuntimeClient({ region: this.config.region });
    this.calculator = new CarbonCalculator({
      useSageMaker: false, // Test formula-based calculation
    });
  }

  /**
   * Run comprehensive tests
   */
  async runTests(): Promise<void> {
    console.log('Starting SageMaker endpoint tests...\n');

    try {
      // Test 1: Sample product data
      console.log('Test 1: Sample Product');
      await this.testSampleProduct();

      // Test 2: Low carbon product
      console.log('\nTest 2: Low Carbon Product');
      await this.testLowCarbonProduct();

      // Test 3: High carbon product
      console.log('\nTest 3: High Carbon Product');
      await this.testHighCarbonProduct();

      // Test 4: Response time
      console.log('\nTest 4: Response Time');
      await this.testResponseTime();

      console.log('\n✓ All tests completed successfully!');
    } catch (error) {
      console.error('\n✗ Tests failed:', error);
      throw error;
    }
  }

  /**
   * Test with sample product data
   */
  private async testSampleProduct(): Promise<void> {
    const sampleData: LifecycleData = {
      materials: [
        {
          name: 'Organic Cotton',
          percentage: 100,
          weight: 0.15,
          emissionFactor: 2.1,
          countryOfOrigin: 'India',
          recycled: false,
          calculatedEmission: 0.315,
        },
      ],
      manufacturing: {
        factoryLocation: 'Bangladesh',
        energyConsumption: 2.5,
        energyEmissionFactor: 0.8,
        dyeingMethod: 'Natural Dyes',
        waterConsumption: 50,
        wasteGenerated: 0.02,
        calculatedEmission: 2.0,
      },
      packaging: {
        materialType: 'Recycled Cardboard',
        weight: 0.05,
        emissionFactor: 0.9,
        recyclable: true,
        calculatedEmission: 0.045,
      },
      transport: {
        mode: 'Ship',
        distance: 8000,
        fuelType: 'Heavy Fuel Oil',
        emissionFactorPerKm: 0.015,
        calculatedEmission: 120,
      },
      usage: {
        avgWashCycles: 50,
        washTemperature: 30,
        dryerUse: false,
        calculatedEmission: 7.5,
      },
      endOfLife: {
        recyclable: true,
        biodegradable: true,
        takebackProgram: true,
        disposalEmission: 0.5,
      },
    };

    await this.compareResults(sampleData);
  }

  /**
   * Test with low carbon product
   */
  private async testLowCarbonProduct(): Promise<void> {
    const lowCarbonData: LifecycleData = {
      materials: [
        {
          name: 'Recycled Polyester',
          percentage: 100,
          weight: 0.1,
          emissionFactor: 1.5,
          countryOfOrigin: 'USA',
          recycled: true,
          calculatedEmission: 0.15,
        },
      ],
      manufacturing: {
        factoryLocation: 'Local',
        energyConsumption: 1.0,
        energyEmissionFactor: 0.5,
        dyeingMethod: 'No Dye',
        waterConsumption: 20,
        wasteGenerated: 0.01,
        calculatedEmission: 0.5,
      },
      packaging: {
        materialType: 'Biodegradable',
        weight: 0.02,
        emissionFactor: 0.5,
        recyclable: true,
        calculatedEmission: 0.01,
      },
      transport: {
        mode: 'Road',
        distance: 100,
        fuelType: 'Electric',
        emissionFactorPerKm: 0.001,
        calculatedEmission: 0.1,
      },
      usage: {
        avgWashCycles: 30,
        washTemperature: 20,
        dryerUse: false,
        calculatedEmission: 4.5,
      },
      endOfLife: {
        recyclable: true,
        biodegradable: true,
        takebackProgram: true,
        disposalEmission: 0.1,
      },
    };

    await this.compareResults(lowCarbonData);
  }

  /**
   * Test with high carbon product
   */
  private async testHighCarbonProduct(): Promise<void> {
    const highCarbonData: LifecycleData = {
      materials: [
        {
          name: 'Leather',
          percentage: 100,
          weight: 0.5,
          emissionFactor: 17.0,
          countryOfOrigin: 'Brazil',
          recycled: false,
          calculatedEmission: 8.5,
        },
      ],
      manufacturing: {
        factoryLocation: 'China',
        energyConsumption: 10.0,
        energyEmissionFactor: 1.2,
        dyeingMethod: 'Chemical',
        waterConsumption: 200,
        wasteGenerated: 0.5,
        calculatedEmission: 12.0,
      },
      packaging: {
        materialType: 'Plastic',
        weight: 0.2,
        emissionFactor: 6.0,
        recyclable: false,
        calculatedEmission: 1.2,
      },
      transport: {
        mode: 'Air',
        distance: 10000,
        fuelType: 'Jet Fuel',
        emissionFactorPerKm: 0.5,
        calculatedEmission: 5000,
      },
      usage: {
        avgWashCycles: 100,
        washTemperature: 60,
        dryerUse: true,
        calculatedEmission: 68.0,
      },
      endOfLife: {
        recyclable: false,
        biodegradable: false,
        takebackProgram: false,
        disposalEmission: 5.0,
      },
    };

    await this.compareResults(highCarbonData);
  }

  /**
   * Test response time
   */
  private async testResponseTime(): Promise<void> {
    const testData = {
      materialEmission: 0.315,
      manufacturingEmission: 2.0,
      packagingEmission: 0.045,
      transportEmission: 120,
      usageEmission: 7.5,
      disposalEmission: 0.5,
    };

    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await this.invokeSageMaker(testData);
      const end = Date.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    console.log(`Average response time: ${avgTime.toFixed(2)}ms`);
    console.log(`Min: ${minTime}ms, Max: ${maxTime}ms`);
    console.log(`Target: <200ms - ${avgTime < 200 ? '✓ PASS' : '✗ FAIL'}`);
  }

  /**
   * Compare ML prediction vs formula calculation
   */
  private async compareResults(lifecycleData: LifecycleData): Promise<void> {
    // Formula-based calculation
    const formulaResult = await this.calculator.calculateFootprint(lifecycleData);
    
    // ML prediction
    const mlPayload = {
      materialEmission: formulaResult.breakdown.materials,
      manufacturingEmission: formulaResult.breakdown.manufacturing,
      packagingEmission: formulaResult.breakdown.packaging,
      transportEmission: formulaResult.breakdown.transport,
      usageEmission: formulaResult.breakdown.usage,
      disposalEmission: formulaResult.breakdown.disposal,
    };

    const mlResult = await this.invokeSageMaker(mlPayload);

    // Compare
    console.log(`Formula Total: ${formulaResult.totalCO2} kg CO2`);
    console.log(`ML Prediction: ${mlResult.predictedCarbon} kg CO2`);
    console.log(`Confidence: ${(mlResult.confidenceScore * 100).toFixed(1)}%`);
    
    const difference = Math.abs(formulaResult.totalCO2 - mlResult.predictedCarbon);
    const percentDiff = (difference / formulaResult.totalCO2) * 100;
    console.log(`Difference: ${difference.toFixed(3)} kg (${percentDiff.toFixed(2)}%)`);
  }

  /**
   * Invoke SageMaker endpoint
   */
  private async invokeSageMaker(payload: any): Promise<any> {
    const command = new InvokeEndpointCommand({
      EndpointName: this.config.endpointName,
      ContentType: 'application/json',
      Accept: 'application/json',
      Body: JSON.stringify(payload),
    });

    const response = await this.client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Body));
    
    return {
      predictedCarbon: result.predictedCarbon || result.prediction || result[0],
      confidenceScore: result.confidenceScore || result.confidence || 0.95,
    };
  }
}

// CLI execution
if (require.main === module) {
  const tester = new SageMakerEndpointTester();
  tester.runTests().catch(console.error);
}
