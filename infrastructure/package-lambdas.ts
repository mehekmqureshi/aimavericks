#!/usr/bin/env node
/**
 * Package Lambda Functions
 * 
 * This script bundles all Lambda functions with their dependencies using esbuild.
 * Each Lambda is packaged as a standalone bundle ready for deployment.
 * 
 * Requirements: Task 41.1
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const LAMBDA_DIR = path.join(__dirname, '../backend/lambdas');
const OUTPUT_DIR = path.join(__dirname, '../dist/lambdas');

interface LambdaConfig {
  name: string;
  entry: string;
  memory: number;
  timeout: number;
  description: string;
}

// Lambda function configurations
const LAMBDA_CONFIGS: LambdaConfig[] = [
  {
    name: 'createProduct',
    entry: 'createProduct.ts',
    memory: 512,
    timeout: 30,
    description: 'Create product with lifecycle data and carbon footprint calculation'
  },
  {
    name: 'generateQR',
    entry: 'generateQR.ts',
    memory: 1024,
    timeout: 30,
    description: 'Generate batch QR codes with digital signatures'
  },
  {
    name: 'getProduct',
    entry: 'getProduct.ts',
    memory: 512,
    timeout: 30,
    description: 'Retrieve product by ID'
  },
  {
    name: 'verifySerial',
    entry: 'verifySerial.ts',
    memory: 512,
    timeout: 30,
    description: 'Verify QR code serial and digital signature'
  },
  {
    name: 'aiGenerate',
    entry: 'aiGenerate.ts',
    memory: 512,
    timeout: 30,
    description: 'Generate AI content using Amazon Bedrock'
  },
  {
    name: 'updateProduct',
    entry: 'updateProduct.ts',
    memory: 512,
    timeout: 30,
    description: 'Update product with recalculation of carbon metrics'
  },
  {
    name: 'listProducts',
    entry: 'listProducts.ts',
    memory: 512,
    timeout: 30,
    description: 'List products by manufacturer'
  },
  {
    name: 'calculateEmission',
    entry: 'calculateEmission.ts',
    memory: 256,
    timeout: 10,
    description: 'Real-time emission calculation for form sections'
  },
  {
    name: 'saveDraft',
    entry: 'saveDraft.ts',
    memory: 256,
    timeout: 10,
    description: 'Save draft lifecycle data'
  },
  {
    name: 'getDraft',
    entry: 'getDraft.ts',
    memory: 256,
    timeout: 10,
    description: 'Retrieve draft lifecycle data'
  },
  {
    name: 'getManufacturer',
    entry: 'getManufacturer.ts',
    memory: 256,
    timeout: 10,
    description: 'Retrieve manufacturer profile'
  },
  {
    name: 'updateManufacturer',
    entry: 'updateManufacturer.ts',
    memory: 256,
    timeout: 10,
    description: 'Update manufacturer profile'
  }
];

/**
 * Clean output directory
 */
function cleanOutputDir(): void {
  console.log('🧹 Cleaning output directory...');
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('✓ Output directory cleaned\n');
}

/**
 * Bundle a single Lambda function
 */
async function bundleLambda(config: LambdaConfig): Promise<void> {
  const entryPoint = path.join(LAMBDA_DIR, config.entry);
  const outputDir = path.join(OUTPUT_DIR, config.name);
  const outputFile = path.join(outputDir, 'index.js');

  console.log(`📦 Bundling ${config.name}...`);

  // Check if entry file exists
  if (!fs.existsSync(entryPoint)) {
    console.error(`  ✗ Entry file not found: ${entryPoint}`);
    throw new Error(`Entry file not found: ${entryPoint}`);
  }

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // Bundle with esbuild
    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: outputFile,
      external: [
        '@aws-sdk/*',  // AWS SDK v3 is available in Lambda runtime
        'aws-sdk'      // AWS SDK v2 (if used)
      ],
      format: 'cjs',
      sourcemap: true,
      minify: true,
      metafile: true,
      logLevel: 'warning'
    });

    // Get bundle size
    const stats = fs.statSync(outputFile);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`  ✓ Bundled: ${sizeKB} KB`);
    console.log(`  ✓ Output: ${outputFile}`);

    // Write config file for deployment
    const configFile = path.join(outputDir, 'config.json');
    fs.writeFileSync(configFile, JSON.stringify({
      name: config.name,
      memory: config.memory,
      timeout: config.timeout,
      description: config.description,
      handler: 'index.handler',
      runtime: 'nodejs20.x'
    }, null, 2));

    console.log(`  ✓ Config written\n`);
  } catch (error: any) {
    console.error(`  ✗ Failed to bundle ${config.name}:`, error.message);
    throw error;
  }
}

/**
 * Create deployment package (ZIP) for a Lambda
 */
function createDeploymentPackage(lambdaName: string): void {
  const lambdaDir = path.join(OUTPUT_DIR, lambdaName);
  const zipFile = path.join(OUTPUT_DIR, `${lambdaName}.zip`);

  console.log(`📦 Creating deployment package for ${lambdaName}...`);

  try {
    // Use PowerShell Compress-Archive on Windows
    if (process.platform === 'win32') {
      execSync(
        `powershell -Command "Compress-Archive -Path '${lambdaDir}\\*' -DestinationPath '${zipFile}' -Force"`,
        { stdio: 'inherit' }
      );
    } else {
      // Use zip on Unix-like systems
      execSync(
        `cd ${lambdaDir} && zip -r ${zipFile} .`,
        { stdio: 'inherit' }
      );
    }

    const stats = fs.statSync(zipFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  ✓ Package created: ${sizeMB} MB\n`);
  } catch (error: any) {
    console.error(`  ✗ Failed to create package:`, error.message);
    throw error;
  }
}

/**
 * Generate deployment manifest
 */
function generateManifest(): void {
  console.log('📝 Generating deployment manifest...');

  const manifest = {
    timestamp: new Date().toISOString(),
    lambdas: LAMBDA_CONFIGS.map(config => ({
      name: config.name,
      bundle: `${config.name}.zip`,
      memory: config.memory,
      timeout: config.timeout,
      description: config.description,
      handler: 'index.handler',
      runtime: 'nodejs20.x'
    }))
  };

  const manifestFile = path.join(OUTPUT_DIR, 'deployment-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

  console.log(`  ✓ Manifest written: ${manifestFile}\n`);
}

/**
 * Main packaging function
 */
async function main(): Promise<void> {
  console.log('🚀 Lambda Packaging Script\n');
  console.log(`Total Lambda functions: ${LAMBDA_CONFIGS.length}\n`);

  try {
    // Step 1: Clean output directory
    cleanOutputDir();

    // Step 2: Bundle all Lambda functions
    console.log('📦 Bundling Lambda functions...\n');
    for (const config of LAMBDA_CONFIGS) {
      await bundleLambda(config);
    }

    // Step 3: Create deployment packages (ZIP files)
    console.log('📦 Creating deployment packages...\n');
    for (const config of LAMBDA_CONFIGS) {
      createDeploymentPackage(config.name);
    }

    // Step 4: Generate deployment manifest
    generateManifest();

    // Summary
    console.log('✅ Packaging Complete!\n');
    console.log('Summary:');
    console.log(`  - Lambda functions bundled: ${LAMBDA_CONFIGS.length}`);
    console.log(`  - Output directory: ${OUTPUT_DIR}`);
    console.log(`  - Deployment packages: ${LAMBDA_CONFIGS.length} ZIP files`);
    console.log(`  - Manifest: deployment-manifest.json\n`);

    console.log('Next steps:');
    console.log('  1. Review the deployment manifest');
    console.log('  2. Run deploy-lambdas.ts to deploy to AWS');
    console.log('  3. Configure environment variables for each Lambda\n');

  } catch (error: any) {
    console.error('\n❌ Packaging failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { bundleLambda, LAMBDA_CONFIGS };
