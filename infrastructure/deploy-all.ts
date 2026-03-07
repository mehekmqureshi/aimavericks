/**
 * Master Deployment Orchestration Script
 * 
 * Orchestrates the complete deployment of the Green Passport Platform:
 * 1. Deploy all Lambda functions to AWS
 * 2. Upload frontend to S3
 * 3. Configure CloudFront distribution
 * 4. Run deployment verification
 * 5. Output deployment URLs
 * 
 * Requirements: 27.1, 27.2, 27.3
 * Task: 50.1
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  LambdaClient,
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  GetFunctionCommand,
  AddPermissionCommand
} from '@aws-sdk/client-lambda';
import { deployFrontend } from './deploy-frontend';
import {
  verifyDynamoDBTables,
  verifyS3Buckets,
  verifyCognitoUserPool,
  verifyCloudFrontDistribution,
  verifyAPIGateway
} from './verify-deployment';

const region = process.env.AWS_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'dev';
const lambdaClient = new LambdaClient({ region });

interface DeploymentManifest {
  timestamp: string;
  lambdas: Array<{
    name: string;
    bundle: string;
    memory: number;
    timeout: number;
    description: string;
    handler: string;
    runtime: string;
  }>;
}

interface DeploymentResult {
  success: boolean;
  lambdasDeployed: string[];
  frontendDeployed: boolean;
  cloudFrontUrl?: string;
  apiEndpoint?: string;
  errors: string[];
}

/**
 * Check if Lambda function exists
 */
async function lambdaExists(functionName: string): Promise<boolean> {
  try {
    await lambdaClient.send(new GetFunctionCommand({ FunctionName: functionName }));
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

/**
 * Deploy a single Lambda function
 */
async function deployLambdaFunction(
  name: string,
  zipPath: string,
  config: {
    memory: number;
    timeout: number;
    description: string;
    handler: string;
    runtime: string;
  }
): Promise<void> {
  const functionName = `gp-${name}-${environment}`;
  const roleArn = process.env[`${name.toUpperCase()}_ROLE_ARN`] || 
                  `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/gp-${name}-role-${environment}`;

  console.log(`  Deploying ${functionName}...`);

  // Read ZIP file
  const zipBuffer = readFileSync(zipPath);

  // Environment variables for Lambda
  const environmentVars: Record<string, string> = {
    ENVIRONMENT: environment,
    PRODUCTS_TABLE: `gp-products-${environment}`,
    MANUFACTURERS_TABLE: `gp-manufacturers-${environment}`,
    SERIALS_TABLE: `gp-product-serials-${environment}`,
    DRAFTS_TABLE: `gp-drafts-${environment}`,
    QR_BUCKET: `gp-qr-codes-${environment}`,
    LOG_LEVEL: process.env.LOG_LEVEL || 'INFO'
  };

  // Add function-specific environment variables
  if (name === 'aiGenerate') {
    environmentVars['BEDROCK_MODEL_ID'] = process.env.BEDROCK_MODEL_ID || 
      'anthropic.claude-3-haiku-20240307-v1:0';
    environmentVars['BEDROCK_REGION'] = region;
  }
  if (name === 'generateQR') {
    environmentVars['SIGNED_URL_EXPIRATION'] = '3600';
  }

  const exists = await lambdaExists(functionName);

  if (!exists) {
    // Create new function
    console.log(`    Creating new function...`);
    await lambdaClient.send(new CreateFunctionCommand({
      FunctionName: functionName,
      Runtime: config.runtime as any,
      Role: roleArn,
      Handler: config.handler,
      Code: { ZipFile: zipBuffer },
      Description: config.description,
      Timeout: config.timeout,
      MemorySize: config.memory,
      Environment: {
        Variables: environmentVars
      },
      Publish: true
    }));
    console.log(`    ✓ Function created`);
  } else {
    // Update existing function
    console.log(`    Updating existing function...`);
    
    // Update code
    await lambdaClient.send(new UpdateFunctionCodeCommand({
      FunctionName: functionName,
      ZipFile: zipBuffer,
      Publish: true
    }));
    
    // Update configuration
    await lambdaClient.send(new UpdateFunctionConfigurationCommand({
      FunctionName: functionName,
      Runtime: config.runtime as any,
      Role: roleArn,
      Handler: config.handler,
      Description: config.description,
      Timeout: config.timeout,
      MemorySize: config.memory,
      Environment: {
        Variables: environmentVars
      }
    }));
    
    console.log(`    ✓ Function updated`);
  }

  // Add API Gateway invoke permission if API Gateway exists
  const apiGatewayArn = process.env.API_GATEWAY_ARN;
  if (apiGatewayArn) {
    try {
      await lambdaClient.send(new AddPermissionCommand({
        FunctionName: functionName,
        StatementId: `apigateway-invoke-${Date.now()}`,
        Action: 'lambda:InvokeFunction',
        Principal: 'apigateway.amazonaws.com',
        SourceArn: `${apiGatewayArn}/*/*/*`
      }));
      console.log(`    ✓ API Gateway permission added`);
    } catch (error: any) {
      if (error.name !== 'ResourceConflictException') {
        console.log(`    ⚠ Could not add API Gateway permission: ${error.message}`);
      }
    }
  }
}

/**
 * Deploy all Lambda functions from manifest
 */
async function deployAllLambdas(): Promise<string[]> {
  console.log('\n📦 Deploying Lambda Functions...\n');

  const manifestPath = join(__dirname, '..', 'dist', 'lambdas', 'deployment-manifest.json');
  
  if (!existsSync(manifestPath)) {
    throw new Error('Deployment manifest not found. Run package-lambdas.ts first.');
  }

  const manifest: DeploymentManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const deployed: string[] = [];

  console.log(`Found ${manifest.lambdas.length} Lambda functions to deploy\n`);

  for (const lambda of manifest.lambdas) {
    const zipPath = join(__dirname, '..', 'dist', 'lambdas', lambda.bundle);
    
    if (!existsSync(zipPath)) {
      console.log(`  ✗ ${lambda.name}: ZIP file not found at ${zipPath}`);
      continue;
    }

    try {
      await deployLambdaFunction(lambda.name, zipPath, {
        memory: lambda.memory,
        timeout: lambda.timeout,
        description: lambda.description,
        handler: lambda.handler,
        runtime: lambda.runtime
      });
      deployed.push(lambda.name);
    } catch (error: any) {
      console.log(`  ✗ ${lambda.name}: Deployment failed - ${error.message}`);
      throw error;
    }
  }

  console.log(`\n✓ Successfully deployed ${deployed.length}/${manifest.lambdas.length} Lambda functions`);
  return deployed;
}

/**
 * Deploy frontend to S3
 */
async function deployFrontendAssets(): Promise<boolean> {
  console.log('\n🌐 Deploying Frontend to S3...\n');

  try {
    await deployFrontend();
    console.log('\n✓ Frontend deployed successfully');
    return true;
  } catch (error: any) {
    console.error(`\n✗ Frontend deployment failed: ${error.message}`);
    throw error;
  }
}

/**
 * Configure CloudFront distribution
 */
async function configureCloudFront(): Promise<string | undefined> {
  console.log('\n☁️  Configuring CloudFront Distribution...\n');

  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  
  if (!distributionId) {
    console.log('  ⚠ CLOUDFRONT_DISTRIBUTION_ID not set');
    console.log('  ℹ Run provision-cloudfront.ts to create a distribution');
    return undefined;
  }

  // CloudFront distribution should already be created
  // Just verify it exists and get the domain
  const { CloudFrontClient, GetDistributionCommand } = await import('@aws-sdk/client-cloudfront');
  const client = new CloudFrontClient({ region: 'us-east-1' });

  try {
    const response = await client.send(new GetDistributionCommand({ Id: distributionId }));
    const domainName = response.Distribution?.DomainName;
    
    if (domainName) {
      console.log(`  ✓ CloudFront distribution active: ${domainName}`);
      return `https://${domainName}`;
    }
  } catch (error: any) {
    console.log(`  ⚠ Could not verify CloudFront distribution: ${error.message}`);
  }

  return undefined;
}

/**
 * Run deployment verification
 */
async function runVerification(): Promise<void> {
  console.log('\n🔍 Running Deployment Verification...\n');

  try {
    await verifyDynamoDBTables();
    await verifyS3Buckets();
    await verifyCognitoUserPool();
    await verifyCloudFrontDistribution();
    await verifyAPIGateway();
    
    console.log('\n✓ Deployment verification completed');
  } catch (error: any) {
    console.log(`\n⚠ Verification completed with warnings: ${error.message}`);
  }
}

/**
 * Print deployment summary
 */
function printDeploymentSummary(result: DeploymentResult): void {
  console.log('\n' + '='.repeat(70));
  console.log('DEPLOYMENT SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\n✓ Lambda Functions Deployed: ${result.lambdasDeployed.length}`);
  result.lambdasDeployed.forEach(name => {
    console.log(`  - gp-${name}-${environment}`);
  });
  
  console.log(`\n✓ Frontend Deployed: ${result.frontendDeployed ? 'Yes' : 'No'}`);
  
  if (result.cloudFrontUrl) {
    console.log(`\n🌐 CloudFront URL: ${result.cloudFrontUrl}`);
    console.log(`   Consumer View: ${result.cloudFrontUrl}`);
    console.log(`   Admin Dashboard: ${result.cloudFrontUrl}/dashboard`);
  }
  
  if (result.apiEndpoint) {
    console.log(`\n🔌 API Endpoint: ${result.apiEndpoint}`);
  } else if (process.env.API_GATEWAY_URL) {
    console.log(`\n🔌 API Endpoint: ${process.env.API_GATEWAY_URL}`);
  }
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors Encountered: ${result.errors.length}`);
    result.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\nNext Steps:');
  console.log('1. Test the CloudFront URL to verify frontend is accessible');
  console.log('2. Test API endpoints using the API Gateway URL');
  console.log('3. Run end-to-end tests (Task 51)');
  console.log('4. Seed test data if needed (Task 50.2)');
  console.log('\n' + '='.repeat(70));
}

/**
 * Main deployment orchestration
 */
async function main() {
  console.log('🚀 Starting Green Passport Platform Deployment');
  console.log(`Region: ${region}`);
  console.log(`Environment: ${environment}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const result: DeploymentResult = {
    success: false,
    lambdasDeployed: [],
    frontendDeployed: false,
    errors: []
  };

  try {
    // Step 1: Deploy Lambda functions
    result.lambdasDeployed = await deployAllLambdas();

    // Step 2: Deploy frontend
    result.frontendDeployed = await deployFrontendAssets();

    // Step 3: Configure CloudFront
    result.cloudFrontUrl = await configureCloudFront();

    // Step 4: Run verification
    await runVerification();

    // Step 5: Get API endpoint
    result.apiEndpoint = process.env.API_GATEWAY_URL;

    result.success = true;
  } catch (error: any) {
    result.errors.push(error.message);
    console.error(`\n❌ Deployment failed: ${error.message}`);
    console.error(error.stack);
  }

  // Print summary
  printDeploymentSummary(result);

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { deployAllLambdas, deployFrontendAssets, configureCloudFront, runVerification };
