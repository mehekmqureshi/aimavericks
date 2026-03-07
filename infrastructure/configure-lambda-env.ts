/**
 * Configure Lambda Environment Variables
 * Sets consistent environment variables across all Lambda functions
 */

import { LambdaClient, UpdateFunctionConfigurationCommand } from '@aws-sdk/client-lambda';

const region = 'us-east-1';
const client = new LambdaClient({ region });
const environment = 'dev';

const lambdaFunctions = [
  'gp-createProduct-dev',
  'gp-listProducts-dev',
  'gp-getProduct-dev',
  'gp-updateProduct-dev',
  'gp-generateQR-dev',
  'gp-verifySerial-dev',
  'gp-aiGenerate-dev',
  'gp-calculateEmission-dev',
  'gp-saveDraft-dev',
  'gp-getDraft-dev',
  'gp-getManufacturer-dev',
  'gp-updateManufacturer-dev',
];

const environmentVariables = {
  PRODUCTS_TABLE: 'Products',
  MANUFACTURERS_TABLE: 'Manufacturers',
  SERIALS_TABLE: 'ProductSerials',
  DRAFTS_TABLE: 'Drafts',
  QR_BUCKET: 'gp-qr-codes-565164711676-dev',
  ENVIRONMENT: 'dev',
  SAGEMAKER_ENDPOINT: 'gp-carbon-predictor-dev',
};

async function configureLambdaEnvironment() {
  console.log('🔧 Configuring Lambda environment variables...\n');
  console.log('Environment Variables:');
  Object.entries(environmentVariables).forEach(([key, value]) => {
    console.log(`  ${key}=${value}`);
  });
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const functionName of lambdaFunctions) {
    try {
      await client.send(
        new UpdateFunctionConfigurationCommand({
          FunctionName: functionName,
          Environment: {
            Variables: environmentVariables,
          },
          Timeout: 30, // Increase timeout to 30 seconds
        })
      );
      console.log(`✅ ${functionName}`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ ${functionName}: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Success: ${successCount}/${lambdaFunctions.length}`);
  console.log(`  Failed: ${failCount}/${lambdaFunctions.length}`);
  
  if (failCount > 0) {
    throw new Error(`Failed to configure ${failCount} Lambda functions`);
  }
}

configureLambdaEnvironment().catch(console.error);
