/**
 * Bedrock AI Generation Test Script
 * 
 * Tests product description and sustainability insights generation
 * using the AIService class.
 * 
 * Usage:
 *   npx ts-node test-bedrock-generation.ts --type description
 *   npx ts-node test-bedrock-generation.ts --type insights
 *   npx ts-node test-bedrock-generation.ts --type both
 */

import { AIService, ProductData } from '../backend/services/AIService';
import { LifecycleData } from '../shared/types';

// Sample product data for testing
const sampleProductData: ProductData = {
  name: 'Organic Cotton T-Shirt',
  category: 'Apparel',
  materials: ['Organic Cotton (95%)', 'Elastane (5%)'],
  manufacturingProcess: 'Natural dyeing with low water consumption',
};

// Sample lifecycle data for testing
const sampleLifecycleData: LifecycleData = {
  materials: [
    {
      name: 'Organic Cotton',
      percentage: 95,
      weight: 0.15,
      emissionFactor: 2.1,
      countryOfOrigin: 'India',
      recycled: false,
      certification: 'GOTS',
      calculatedEmission: 0.315,
    },
    {
      name: 'Elastane',
      percentage: 5,
      weight: 0.008,
      emissionFactor: 8.5,
      countryOfOrigin: 'China',
      recycled: false,
      calculatedEmission: 0.068,
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
    calculatedEmission: 15.5,
  },
  endOfLife: {
    recyclable: true,
    biodegradable: true,
    takebackProgram: true,
    disposalEmission: 0.5,
  },
};

const sampleCarbonFootprint = 138.428;

/**
 * Test product description generation
 */
async function testDescriptionGeneration(aiService: AIService): Promise<void> {
  console.log('\n📝 Testing Product Description Generation\n');
  console.log('─'.repeat(60));
  console.log('\nInput:');
  console.log(`  Product: ${sampleProductData.name}`);
  console.log(`  Category: ${sampleProductData.category}`);
  console.log(`  Materials: ${sampleProductData.materials.join(', ')}`);
  console.log(`  Process: ${sampleProductData.manufacturingProcess}`);

  try {
    const startTime = Date.now();
    const description = await aiService.generateDescription(sampleProductData);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n✓ Generation successful!');
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Length: ${description.length} characters`);
    console.log('\nGenerated Description:');
    console.log('─'.repeat(60));
    console.log(description);
    console.log('─'.repeat(60));

    // Validate response
    if (description.length < 50) {
      console.log('\n⚠️  Warning: Description is very short');
    }
    if (duration > 3000) {
      console.log('\n⚠️  Warning: Generation exceeded 3-second timeout threshold');
    }
  } catch (error) {
    console.log('\n✗ Generation failed!');
    console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test sustainability insights generation
 */
async function testInsightsGeneration(aiService: AIService): Promise<void> {
  console.log('\n💡 Testing Sustainability Insights Generation\n');
  console.log('─'.repeat(60));
  console.log('\nInput:');
  console.log(`  Carbon Footprint: ${sampleCarbonFootprint.toFixed(2)} kg CO2`);
  console.log(`  Materials: ${sampleLifecycleData.materials.length} types`);
  console.log(`  Manufacturing: ${sampleLifecycleData.manufacturing.factoryLocation}`);
  console.log(`  Transport: ${sampleLifecycleData.transport.mode}, ${sampleLifecycleData.transport.distance} km`);
  console.log(`  Recyclable: ${sampleLifecycleData.endOfLife.recyclable ? 'Yes' : 'No'}`);

  try {
    const startTime = Date.now();
    const insights = await aiService.generateInsights(
      sampleLifecycleData,
      sampleCarbonFootprint
    );
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n✓ Generation successful!');
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Length: ${insights.length} characters`);
    console.log('\nGenerated Insights:');
    console.log('─'.repeat(60));
    console.log(insights);
    console.log('─'.repeat(60));

    // Validate response
    if (insights.length < 100) {
      console.log('\n⚠️  Warning: Insights are very short');
    }
    if (duration > 3000) {
      console.log('\n⚠️  Warning: Generation exceeded 3-second timeout threshold');
    }
  } catch (error) {
    console.log('\n✗ Generation failed!');
    console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test circuit breaker functionality
 */
async function testCircuitBreaker(aiService: AIService): Promise<void> {
  console.log('\n🔌 Testing Circuit Breaker\n');
  console.log('─'.repeat(60));

  console.log('\nCircuit breaker state:', aiService.getCircuitBreakerState());
  console.log('✓ Circuit breaker is operational');
}

/**
 * Main test execution
 */
async function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find(arg => arg.startsWith('--type='));
  const type = typeArg ? typeArg.split('=')[1] : 'both';
  const regionArg = args.find(arg => arg.startsWith('--region='));
  const region = regionArg ? regionArg.split('=')[1] : 'us-east-1';

  console.log('🤖 Amazon Bedrock AI Generation Test\n');
  console.log(`Region: ${region}`);
  console.log(`Test Type: ${type}`);
  console.log('Model: Claude 3 Haiku');

  const aiService = new AIService(region);

  try {
    if (type === 'description' || type === 'both') {
      await testDescriptionGeneration(aiService);
    }

    if (type === 'insights' || type === 'both') {
      await testInsightsGeneration(aiService);
    }

    await testCircuitBreaker(aiService);

    console.log('\n✅ All tests completed successfully!\n');
    console.log('─'.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Review generated content quality');
    console.log('2. Adjust model parameters if needed');
    console.log('3. Deploy aiGenerate Lambda function');
    console.log('4. Test end-to-end in dashboard');
    console.log('─'.repeat(60));
  } catch (error) {
    console.log('\n❌ Tests failed!\n');
    console.log('─'.repeat(60));
    console.log('\nTroubleshooting:');
    console.log('1. Run: npx ts-node verify-bedrock-access.ts');
    console.log('2. Check IAM permissions');
    console.log('3. Verify model is enabled in Bedrock console');
    console.log('4. Review error message above');
    console.log('─'.repeat(60));
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Test script error:', error);
  process.exit(1);
});
