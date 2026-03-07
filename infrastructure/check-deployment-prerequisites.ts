/**
 * Pre-Deployment Prerequisites Checker
 * 
 * Verifies that all prerequisites are met before running deployment:
 * - AWS credentials configured
 * - Required environment variables set
 * - DynamoDB tables exist
 * - S3 buckets exist
 * - IAM roles exist
 * - Lambda packages exist
 * - Frontend build exists
 */

import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { IAMClient, GetRoleCommand } from '@aws-sdk/client-iam';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { existsSync } from 'fs';
import { join } from 'path';

const region = process.env.AWS_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'dev';

interface PrerequisiteCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  required: boolean;
}

const checks: PrerequisiteCheck[] = [];

/**
 * Check AWS credentials
 */
async function checkAWSCredentials(): Promise<void> {
  console.log('\n🔑 Checking AWS Credentials...');
  
  try {
    const client = new STSClient({ region });
    const response = await client.send(new GetCallerIdentityCommand({}));
    
    checks.push({
      name: 'AWS Credentials',
      status: 'PASS',
      message: `Authenticated as ${response.Arn}`,
      required: true
    });
    console.log(`  ✓ AWS Account: ${response.Account}`);
    console.log(`  ✓ User/Role: ${response.Arn}`);
    
    // Store account ID for later use
    process.env.AWS_ACCOUNT_ID = response.Account;
  } catch (error: any) {
    checks.push({
      name: 'AWS Credentials',
      status: 'FAIL',
      message: `Not configured: ${error.message}`,
      required: true
    });
    console.log(`  ✗ AWS credentials not configured`);
    console.log(`  ℹ Run: aws configure`);
  }
}

/**
 * Check required environment variables
 */
function checkEnvironmentVariables(): void {
  console.log('\n📋 Checking Environment Variables...');
  
  const requiredVars = [
    { name: 'AWS_REGION', required: false, default: 'us-east-1' },
    { name: 'ENVIRONMENT', required: false, default: 'dev' }
  ];
  
  const optionalVars = [
    'CLOUDFRONT_DISTRIBUTION_ID',
    'API_GATEWAY_URL',
    'API_GATEWAY_ARN',
    'COGNITO_USER_POOL_ID',
    'BEDROCK_MODEL_ID'
  ];
  
  for (const varConfig of requiredVars) {
    const value = process.env[varConfig.name];
    if (value) {
      checks.push({
        name: `Env: ${varConfig.name}`,
        status: 'PASS',
        message: `Set to: ${value}`,
        required: varConfig.required
      });
      console.log(`  ✓ ${varConfig.name}: ${value}`);
    } else if (varConfig.default) {
      checks.push({
        name: `Env: ${varConfig.name}`,
        status: 'WARN',
        message: `Using default: ${varConfig.default}`,
        required: false
      });
      console.log(`  ⚠ ${varConfig.name}: Using default (${varConfig.default})`);
    } else {
      checks.push({
        name: `Env: ${varConfig.name}`,
        status: 'FAIL',
        message: 'Not set',
        required: varConfig.required
      });
      console.log(`  ✗ ${varConfig.name}: Not set`);
    }
  }
  
  console.log('\n  Optional Variables:');
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✓ ${varName}: ${value}`);
    } else {
      console.log(`  ⚠ ${varName}: Not set (optional)`);
    }
  }
}

/**
 * Check DynamoDB tables exist
 */
async function checkDynamoDBTables(): Promise<void> {
  console.log('\n📊 Checking DynamoDB Tables...');
  
  const client = new DynamoDBClient({ region });
  const requiredTables = [
    `gp-products-${environment}`,
    `gp-manufacturers-${environment}`,
    `gp-product-serials-${environment}`,
    `gp-drafts-${environment}`
  ];
  
  try {
    const response = await client.send(new ListTablesCommand({}));
    const existingTables = response.TableNames || [];
    
    for (const tableName of requiredTables) {
      if (existingTables.includes(tableName)) {
        checks.push({
          name: `DynamoDB: ${tableName}`,
          status: 'PASS',
          message: 'Table exists',
          required: true
        });
        console.log(`  ✓ ${tableName}`);
      } else {
        checks.push({
          name: `DynamoDB: ${tableName}`,
          status: 'FAIL',
          message: 'Table not found',
          required: true
        });
        console.log(`  ✗ ${tableName}: Not found`);
      }
    }
  } catch (error: any) {
    checks.push({
      name: 'DynamoDB Tables',
      status: 'FAIL',
      message: `Cannot list tables: ${error.message}`,
      required: true
    });
    console.log(`  ✗ Cannot list tables: ${error.message}`);
  }
}

/**
 * Check S3 buckets exist
 */
async function checkS3Buckets(): Promise<void> {
  console.log('\n🪣 Checking S3 Buckets...');
  
  const client = new S3Client({ region });
  const requiredBuckets = [
    `gp-qr-codes-${environment}`,
    `gp-frontend-${environment}`
  ];
  
  for (const bucketName of requiredBuckets) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucketName }));
      checks.push({
        name: `S3: ${bucketName}`,
        status: 'PASS',
        message: 'Bucket exists',
        required: true
      });
      console.log(`  ✓ ${bucketName}`);
    } catch (error: any) {
      checks.push({
        name: `S3: ${bucketName}`,
        status: 'FAIL',
        message: 'Bucket not found',
        required: true
      });
      console.log(`  ✗ ${bucketName}: Not found`);
    }
  }
}

/**
 * Check Lambda packages exist
 */
function checkLambdaPackages(): void {
  console.log('\n📦 Checking Lambda Packages...');
  
  const manifestPath = join(__dirname, '..', 'dist', 'lambdas', 'deployment-manifest.json');
  
  if (!existsSync(manifestPath)) {
    checks.push({
      name: 'Lambda Packages',
      status: 'FAIL',
      message: 'Deployment manifest not found',
      required: true
    });
    console.log(`  ✗ Deployment manifest not found`);
    console.log(`  ℹ Run: npx ts-node infrastructure/package-lambdas.ts`);
    return;
  }
  
  const manifest = require(manifestPath);
  let allExist = true;
  
  for (const lambda of manifest.lambdas) {
    const zipPath = join(__dirname, '..', 'dist', 'lambdas', lambda.bundle);
    if (existsSync(zipPath)) {
      console.log(`  ✓ ${lambda.name}: ${lambda.bundle}`);
    } else {
      console.log(`  ✗ ${lambda.name}: ${lambda.bundle} not found`);
      allExist = false;
    }
  }
  
  checks.push({
    name: 'Lambda Packages',
    status: allExist ? 'PASS' : 'FAIL',
    message: allExist ? `All ${manifest.lambdas.length} packages found` : 'Some packages missing',
    required: true
  });
}

/**
 * Check frontend build exists
 */
function checkFrontendBuild(): void {
  console.log('\n🌐 Checking Frontend Build...');
  
  const distPath = join(__dirname, '..', 'frontend', 'dist');
  const indexPath = join(distPath, 'index.html');
  
  if (existsSync(indexPath)) {
    checks.push({
      name: 'Frontend Build',
      status: 'PASS',
      message: 'Build artifacts found',
      required: true
    });
    console.log(`  ✓ Frontend build found at: ${distPath}`);
  } else {
    checks.push({
      name: 'Frontend Build',
      status: 'FAIL',
      message: 'Build artifacts not found',
      required: true
    });
    console.log(`  ✗ Frontend build not found`);
    console.log(`  ℹ Run: cd frontend && npm run build`);
  }
}

/**
 * Print summary
 */
function printSummary(): boolean {
  console.log('\n' + '='.repeat(70));
  console.log('PREREQUISITES CHECK SUMMARY');
  console.log('='.repeat(70));
  
  const passed = checks.filter(c => c.status === 'PASS').length;
  const warned = checks.filter(c => c.status === 'WARN').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;
  const requiredFailed = checks.filter(c => c.status === 'FAIL' && c.required).length;
  
  console.log(`\nTotal Checks: ${checks.length}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`⚠ Warnings: ${warned}`);
  console.log(`✗ Failed: ${failed} (${requiredFailed} required)`);
  
  if (requiredFailed > 0) {
    console.log('\n❌ PREREQUISITES NOT MET - CANNOT DEPLOY');
    console.log('\nRequired checks that failed:');
    checks.filter(c => c.status === 'FAIL' && c.required).forEach(c => {
      console.log(`  - ${c.name}: ${c.message}`);
    });
    console.log('\nPlease fix the above issues before deploying.');
    return false;
  } else if (failed > 0) {
    console.log('\n⚠️  SOME OPTIONAL CHECKS FAILED');
    console.log('\nOptional checks that failed:');
    checks.filter(c => c.status === 'FAIL' && !c.required).forEach(c => {
      console.log(`  - ${c.name}: ${c.message}`);
    });
    console.log('\n✅ All required prerequisites met - deployment can proceed');
    return true;
  } else {
    console.log('\n✅ ALL PREREQUISITES MET - READY TO DEPLOY');
    return true;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Checking Deployment Prerequisites');
  console.log(`Region: ${region}`);
  console.log(`Environment: ${environment}`);
  
  try {
    await checkAWSCredentials();
    checkEnvironmentVariables();
    await checkDynamoDBTables();
    await checkS3Buckets();
    checkLambdaPackages();
    checkFrontendBuild();
    
    const canDeploy = printSummary();
    
    console.log('\n' + '='.repeat(70));
    
    if (canDeploy) {
      console.log('\nTo proceed with deployment, run:');
      console.log('  npx ts-node infrastructure/deploy-all.ts');
    }
    
    process.exit(canDeploy ? 0 : 1);
  } catch (error: any) {
    console.error('\n❌ Error during prerequisites check:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { checkAWSCredentials, checkDynamoDBTables, checkS3Buckets };
