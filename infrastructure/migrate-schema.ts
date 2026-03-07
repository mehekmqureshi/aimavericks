/**
 * Schema Migration Script
 * 
 * This script migrates products from legacy lifecycle format to structured format.
 * 
 * Requirements:
 * - 26.1.4: Preserve carbon footprint within 0.01 kg tolerance
 * - 26.1.5: Map legacy fields to new structured format
 * 
 * Usage:
 *   ts-node infrastructure/migrate-schema.ts [--dry-run] [--table-name <name>]
 * 
 * Options:
 *   --dry-run: Validate migration without updating database
 *   --table-name: Override default table name (default: Products)
 */

import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { MigrationService } from '../backend/services/MigrationService';
import { ProductRepository } from '../backend/repositories/ProductRepository';
import { LegacyProduct, Product } from '../shared/types';

interface MigrationOptions {
  dryRun: boolean;
  tableName: string;
  region: string;
}

interface MigrationStats {
  totalScanned: number;
  legacyProducts: number;
  structuredProducts: number;
  successfulMigrations: number;
  failedMigrations: number;
  skippedProducts: number;
  errors: Array<{ productId: string; error: string }>;
  startTime: Date;
  endTime?: Date;
}

/**
 * Parse command line arguments
 */
function parseArguments(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: false,
    tableName: process.env.PRODUCTS_TABLE_NAME || 'Products',
    region: process.env.AWS_REGION || 'us-east-1'
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--table-name':
        if (i + 1 < args.length) {
          options.tableName = args[i + 1];
          i++;
        }
        break;
      case '--region':
        if (i + 1 < args.length) {
          options.region = args[i + 1];
          i++;
        }
        break;
      case '--help':
        console.log(`
Schema Migration Script

Usage:
  ts-node infrastructure/migrate-schema.ts [options]

Options:
  --dry-run           Validate migration without updating database
  --table-name <name> Override default table name (default: Products)
  --region <region>   AWS region (default: us-east-1)
  --help              Show this help message

Environment Variables:
  PRODUCTS_TABLE_NAME  Default table name
  AWS_REGION           Default AWS region
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Query all products from DynamoDB
 */
async function scanAllProducts(
  client: DynamoDBClient,
  tableName: string
): Promise<any[]> {
  const products: any[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  console.log(`Scanning table: ${tableName}...`);

  do {
    const command = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey
    });

    const response = await client.send(command);

    if (response.Items) {
      const items = response.Items.map(item => unmarshall(item));
      products.push(...items);
      console.log(`  Scanned ${products.length} products so far...`);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Total products scanned: ${products.length}\n`);
  return products;
}

/**
 * Execute migration for all products
 */
async function executeMigration(options: MigrationOptions): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalScanned: 0,
    legacyProducts: 0,
    structuredProducts: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    skippedProducts: 0,
    errors: [],
    startTime: new Date()
  };

  console.log('='.repeat(80));
  console.log('Schema Migration Script');
  console.log('='.repeat(80));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`);
  console.log(`Table: ${options.tableName}`);
  console.log(`Region: ${options.region}`);
  console.log('='.repeat(80));
  console.log();

  // Initialize services
  const client = new DynamoDBClient({ region: options.region });
  const migrationService = new MigrationService();
  const productRepository = new ProductRepository(client, options.tableName);

  try {
    // Scan all products
    const allProducts = await scanAllProducts(client, options.tableName);
    stats.totalScanned = allProducts.length;

    if (stats.totalScanned === 0) {
      console.log('No products found in table. Nothing to migrate.');
      return stats;
    }

    // Detect schema versions
    console.log('Detecting schema versions...');
    for (const product of allProducts) {
      const schemaVersion = migrationService.detectSchemaVersion(product);
      if (schemaVersion === 'legacy') {
        stats.legacyProducts++;
      } else {
        stats.structuredProducts++;
      }
    }

    console.log(`  Legacy products: ${stats.legacyProducts}`);
    console.log(`  Structured products: ${stats.structuredProducts}`);
    console.log();

    if (stats.legacyProducts === 0) {
      console.log('No legacy products found. All products are already in structured format.');
      return stats;
    }

    // Migrate legacy products
    console.log(`Migrating ${stats.legacyProducts} legacy products...`);
    console.log();

    for (const product of allProducts) {
      const schemaVersion = migrationService.detectSchemaVersion(product);
      
      if (schemaVersion === 'structured') {
        stats.skippedProducts++;
        continue;
      }

      try {
        // Cast to LegacyProduct
        const legacyProduct = product as LegacyProduct;
        
        console.log(`Processing product: ${legacyProduct.productId} (${legacyProduct.name})`);
        console.log(`  Original carbon footprint: ${legacyProduct.carbonFootprint} kg CO2`);

        // Migrate product
        const migratedProduct = migrationService.migrateProduct(legacyProduct);
        console.log(`  Migrated carbon footprint: ${migratedProduct.carbonFootprint} kg CO2`);

        // Validate migration
        const validation = migrationService.validateMigration(legacyProduct, migratedProduct);
        
        if (!validation.valid) {
          console.log(`  ❌ Validation FAILED:`);
          validation.errors.forEach(error => console.log(`     - ${error}`));
          stats.failedMigrations++;
          stats.errors.push({
            productId: legacyProduct.productId,
            error: validation.errors.join('; ')
          });
          continue;
        }

        console.log(`  ✓ Validation passed (carbon difference: ${validation.carbonDifference.toFixed(4)} kg)`);

        // Update database (unless dry run)
        if (!options.dryRun) {
          await productRepository.updateProduct(migratedProduct.productId, {
            lifecycleData: migratedProduct.lifecycleData,
            carbonBreakdown: migratedProduct.carbonBreakdown,
            sustainabilityScore: migratedProduct.sustainabilityScore,
            badge: migratedProduct.badge
          });
          console.log(`  ✓ Database updated`);
        } else {
          console.log(`  ⊘ Database update skipped (dry run)`);
        }

        stats.successfulMigrations++;
        console.log();

      } catch (error) {
        console.log(`  ❌ Migration FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
        stats.failedMigrations++;
        stats.errors.push({
          productId: product.productId || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log();
      }
    }

  } catch (error) {
    console.error('Fatal error during migration:');
    console.error(error);
    throw error;
  }

  stats.endTime = new Date();
  return stats;
}

/**
 * Print migration summary
 */
function printSummary(stats: MigrationStats, options: MigrationOptions): void {
  const duration = stats.endTime 
    ? (stats.endTime.getTime() - stats.startTime.getTime()) / 1000 
    : 0;

  console.log('='.repeat(80));
  console.log('Migration Summary');
  console.log('='.repeat(80));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log();
  console.log(`Total products scanned: ${stats.totalScanned}`);
  console.log(`  - Legacy format: ${stats.legacyProducts}`);
  console.log(`  - Structured format: ${stats.structuredProducts}`);
  console.log();
  console.log(`Migration results:`);
  console.log(`  ✓ Successful: ${stats.successfulMigrations}`);
  console.log(`  ❌ Failed: ${stats.failedMigrations}`);
  console.log(`  ⊘ Skipped: ${stats.skippedProducts}`);
  console.log();

  if (stats.errors.length > 0) {
    console.log('Errors:');
    stats.errors.forEach(({ productId, error }) => {
      console.log(`  - ${productId}: ${error}`);
    });
    console.log();
  }

  if (options.dryRun && stats.successfulMigrations > 0) {
    console.log('⚠️  This was a DRY RUN. No changes were made to the database.');
    console.log('   Run without --dry-run to apply migrations.');
  } else if (!options.dryRun && stats.successfulMigrations > 0) {
    console.log('✓ Migration completed successfully!');
  }

  console.log('='.repeat(80));
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const options = parseArguments();
    const stats = await executeMigration(options);
    printSummary(stats, options);

    // Exit with error code if any migrations failed
    if (stats.failedMigrations > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration script failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { executeMigration, parseArguments, scanAllProducts };
