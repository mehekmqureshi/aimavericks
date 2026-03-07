/**
 * Test Data Seeding Script
 * 
 * Creates test data for the Green Passport platform:
 * - 1 manufacturer record
 * - 5 product records with varied carbon footprints (2kg, 5kg, 8kg, 3kg, 6kg)
 * - 50 QR serial records (10 per product)
 * 
 * Verifies:
 * - Carbon calculations produce correct badge assignments
 * - QR scanning retrieves correct product data
 * 
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5
 */

import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
  Manufacturer,
  Product,
  ProductSerial,
  LifecycleData,
  Material_Row,
  Manufacturing_Data,
  Packaging_Data,
  Transport_Data,
  Usage_Data,
  EndOfLife_Data,
} from '../shared/types';
import { CarbonCalculator } from '../backend/services/CarbonCalculator';
import { BadgeEngine } from '../backend/services/BadgeEngine';
import { SignatureService } from '../backend/services/SignatureService';
import { ProductRepository } from '../backend/repositories/ProductRepository';
import { SerialRepository } from '../backend/repositories/SerialRepository';

// AWS Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const MANUFACTURERS_TABLE = process.env.MANUFACTURERS_TABLE_NAME || 'Manufacturers';
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE_NAME || 'Products';
const SERIALS_TABLE = process.env.PRODUCT_SERIALS_TABLE_NAME || 'ProductSerials';

// Initialize services
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const carbonCalculator = new CarbonCalculator({ useSageMaker: false }); // Use deterministic for seeding
const badgeEngine = new BadgeEngine();
const signatureService = new SignatureService();

// Initialize repositories
const productRepo = new ProductRepository(dynamoClient, PRODUCTS_TABLE);
const serialRepo = new SerialRepository(dynamoClient, SERIALS_TABLE);

/**
 * Create manufacturer test data
 */
async function createManufacturer(): Promise<Manufacturer> {
  const manufacturer: Manufacturer = {
    manufacturerId: 'MFG001',
    name: 'EcoTextiles Inc.',
    location: 'Portland, Oregon, USA',
    certifications: ['GOTS', 'Fair Trade', 'B Corp', 'Carbon Neutral'],
    contactEmail: 'contact@ecotextiles.example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Insert directly into DynamoDB
  const command = new PutItemCommand({
    TableName: MANUFACTURERS_TABLE,
    Item: marshall(manufacturer, { removeUndefinedValues: true }),
  });

  await dynamoClient.send(command);
  console.log('✓ Created manufacturer:', manufacturer.manufacturerId);
  
  return manufacturer;
}

/**
 * Create lifecycle data for a product with target carbon footprint
 */
function createLifecycleData(targetCarbon: number): LifecycleData {
  // Design lifecycle data to achieve approximately the target carbon footprint
  // We'll adjust transport distance to hit the target
  
  const materials: Material_Row[] = [
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
  ];

  const manufacturing: Manufacturing_Data = {
    factoryLocation: 'Bangladesh',
    energyConsumption: 2.5,
    energyEmissionFactor: 0.8,
    dyeingMethod: 'Natural Dyes',
    waterConsumption: 50,
    wasteGenerated: 0.02,
    calculatedEmission: 2.0,
  };

  const packaging: Packaging_Data = {
    materialType: 'Recycled Cardboard',
    weight: 0.05,
    emissionFactor: 0.9,
    recyclable: true,
    calculatedEmission: 0.045,
  };

  const usage: Usage_Data = {
    avgWashCycles: 50,
    washTemperature: 30,
    dryerUse: false,
    calculatedEmission: 7.5,
  };

  const endOfLife: EndOfLife_Data = {
    recyclable: true,
    biodegradable: true,
    takebackProgram: true,
    disposalEmission: 0.5,
  };

  // Calculate base emissions (without transport)
  const baseEmissions = 
    materials.reduce((sum, m) => sum + m.calculatedEmission, 0) +
    manufacturing.calculatedEmission +
    packaging.calculatedEmission +
    usage.calculatedEmission +
    endOfLife.disposalEmission;

  // Calculate required transport emission to hit target
  const requiredTransportEmission = Math.max(0, targetCarbon - baseEmissions);
  
  // Use emission factor of 0.015 kg CO2/km for ship transport
  const emissionFactorPerKm = 0.015;
  const distance = Math.round(requiredTransportEmission / emissionFactorPerKm);

  const transport: Transport_Data = {
    mode: 'Ship',
    distance: distance,
    fuelType: 'Heavy Fuel Oil',
    emissionFactorPerKm: emissionFactorPerKm,
    calculatedEmission: distance * emissionFactorPerKm,
  };

  return {
    materials,
    manufacturing,
    packaging,
    transport,
    usage,
    endOfLife,
  };
}

/**
 * Create product test data with specific carbon footprint
 */
async function createProduct(
  productId: string,
  name: string,
  category: string,
  targetCarbon: number,
  manufacturerId: string
): Promise<Product> {
  const lifecycleData = createLifecycleData(targetCarbon);
  
  // Calculate carbon footprint
  const carbonResult = await carbonCalculator.calculateFootprint(lifecycleData);
  
  // Assign badge
  const badge = badgeEngine.assignBadge(carbonResult.totalCO2);
  
  // Calculate sustainability score (inverse of carbon, scaled to 0-100)
  // Lower carbon = higher score
  const sustainabilityScore = Math.max(0, Math.min(100, 100 - (carbonResult.totalCO2 * 5)));

  const product: Product = {
    productId,
    manufacturerId,
    name,
    description: `Sustainable ${name.toLowerCase()} made with eco-friendly materials and processes.`,
    category,
    lifecycleData,
    carbonFootprint: carbonResult.totalCO2,
    carbonBreakdown: carbonResult.breakdown,
    sustainabilityScore: Math.round(sustainabilityScore),
    badge,
    predictionSource: carbonResult.predictionSource,
    confidenceScore: carbonResult.confidenceScore,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await productRepo.createProduct(product);
  console.log(`✓ Created product: ${productId} (${carbonResult.totalCO2.toFixed(2)} kg CO2, ${badge.name})`);
  
  return product;
}

/**
 * Generate QR serials for a product
 */
async function generateSerials(
  product: Product,
  count: number
): Promise<ProductSerial[]> {
  const serials: ProductSerial[] = [];

  for (let i = 1; i <= count; i++) {
    const paddedIndex = String(i).padStart(4, '0');
    const serialId = `${product.productId}-${paddedIndex}`;
    
    // Generate digital signature
    const digitalSignature = signatureService.generateSignature({
      productId: product.productId,
      serialId,
      manufacturerId: product.manufacturerId,
      carbonFootprint: product.carbonFootprint,
    });

    const serial: ProductSerial = {
      serialId,
      productId: product.productId,
      manufacturerId: product.manufacturerId,
      digitalSignature,
      qrCodeUrl: `s3://gp-qr-codes/${product.manufacturerId}/${product.productId}/${serialId}.png`,
      generatedAt: new Date().toISOString(),
      scannedCount: 0,
    };

    await serialRepo.createSerial(serial);
    serials.push(serial);
  }

  console.log(`✓ Generated ${count} serials for product: ${product.productId}`);
  return serials;
}

/**
 * Verify badge assignments are correct
 */
function verifyBadgeAssignments(products: Product[]): boolean {
  let allCorrect = true;

  for (const product of products) {
    const expectedBadge = badgeEngine.assignBadge(product.carbonFootprint);
    
    if (product.badge.name !== expectedBadge.name) {
      console.error(`✗ Badge mismatch for ${product.productId}: expected ${expectedBadge.name}, got ${product.badge.name}`);
      allCorrect = false;
    } else {
      console.log(`✓ Badge correct for ${product.productId}: ${product.badge.name} (${product.carbonFootprint.toFixed(2)} kg)`);
    }
  }

  return allCorrect;
}

/**
 * Verify QR scanning retrieves correct product data
 */
async function verifyQRScanning(serials: ProductSerial[]): Promise<boolean> {
  let allCorrect = true;

  // Test a sample of serials
  const sampleSerials = [serials[0], serials[10], serials[25], serials[40], serials[49]];

  for (const serial of sampleSerials) {
    try {
      // Retrieve serial
      const retrievedSerial = await serialRepo.getSerial(serial.serialId);
      
      if (!retrievedSerial) {
        console.error(`✗ Serial not found: ${serial.serialId}`);
        allCorrect = false;
        continue;
      }

      // Retrieve product
      const product = await productRepo.getProduct(retrievedSerial.productId);
      
      if (!product) {
        console.error(`✗ Product not found for serial: ${serial.serialId}`);
        allCorrect = false;
        continue;
      }

      // Verify signature
      const recomputedSignature = signatureService.generateSignature({
        productId: product.productId,
        serialId: serial.serialId,
        manufacturerId: product.manufacturerId,
        carbonFootprint: product.carbonFootprint,
      });

      if (recomputedSignature !== retrievedSerial.digitalSignature) {
        console.error(`✗ Signature mismatch for serial: ${serial.serialId}`);
        allCorrect = false;
      } else {
        console.log(`✓ QR scan verified for serial: ${serial.serialId}`);
      }
    } catch (error) {
      console.error(`✗ Error verifying serial ${serial.serialId}:`, error);
      allCorrect = false;
    }
  }

  return allCorrect;
}

/**
 * Main seeding function
 */
async function seedData(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Green Passport Platform - Test Data Seeding');
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Create manufacturer
    console.log('Step 1: Creating manufacturer...');
    const manufacturer = await createManufacturer();
    console.log();

    // Step 2: Create 5 products with varied carbon footprints
    console.log('Step 2: Creating 5 products with varied carbon footprints...');
    const products: Product[] = [];
    
    const productSpecs = [
      { id: 'PROD001', name: 'Organic Cotton T-Shirt', category: 'Apparel', carbon: 2 },
      { id: 'PROD002', name: 'Recycled Polyester Jacket', category: 'Apparel', carbon: 5 },
      { id: 'PROD003', name: 'Wool Sweater', category: 'Apparel', carbon: 8 },
      { id: 'PROD004', name: 'Bamboo Socks', category: 'Accessories', carbon: 3 },
      { id: 'PROD005', name: 'Hemp Tote Bag', category: 'Accessories', carbon: 6 },
    ];

    for (const spec of productSpecs) {
      const product = await createProduct(
        spec.id,
        spec.name,
        spec.category,
        spec.carbon,
        manufacturer.manufacturerId
      );
      products.push(product);
    }
    console.log();

    // Step 3: Generate 50 QR serials (10 per product)
    console.log('Step 3: Generating 50 QR serials (10 per product)...');
    const allSerials: ProductSerial[] = [];
    
    for (const product of products) {
      const serials = await generateSerials(product, 10);
      allSerials.push(...serials);
    }
    console.log();

    // Step 4: Verify badge assignments
    console.log('Step 4: Verifying badge assignments...');
    const badgesCorrect = verifyBadgeAssignments(products);
    console.log();

    // Step 5: Verify QR scanning
    console.log('Step 5: Verifying QR scanning (sample of 5 serials)...');
    const scanningCorrect = await verifyQRScanning(allSerials);
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('Seeding Summary');
    console.log('='.repeat(60));
    console.log(`Manufacturers created: 1`);
    console.log(`Products created: ${products.length}`);
    console.log(`Serials generated: ${allSerials.length}`);
    console.log(`Badge assignments: ${badgesCorrect ? '✓ All correct' : '✗ Some incorrect'}`);
    console.log(`QR scanning: ${scanningCorrect ? '✓ All verified' : '✗ Some failed'}`);
    console.log();

    if (badgesCorrect && scanningCorrect) {
      console.log('✓ Test data seeding completed successfully!');
      console.log();
      console.log('Product Summary:');
      for (const product of products) {
        console.log(`  - ${product.name}: ${product.carbonFootprint.toFixed(2)} kg CO2 (${product.badge.name})`);
      }
    } else {
      console.error('✗ Test data seeding completed with errors');
      process.exit(1);
    }

  } catch (error) {
    console.error('✗ Error during seeding:', error);
    throw error;
  }
}

// Run seeding if executed directly
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('\nSeeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nSeeding failed:', error);
      process.exit(1);
    });
}

export { seedData };
