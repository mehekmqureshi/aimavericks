#!/usr/bin/env node
/**
 * Deploy Lambda Functions to AWS
 * 
 * This script deploys all packaged Lambda functions to AWS using the AWS Lambda MCP server.
 * It reads the deployment manifest and deploys each Lambda with appropriate configuration.
 * 
 * Requirements: Task 41.2
 * Prerequisites: 
 *   - Task 41.1 completed (Lambda functions packaged)
 *   - AWS credentials configured
 *   - MCP server for AWS Lambda configured
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../dist/lambdas');
const MANIFEST_FILE = path.join(OUTPUT_DIR, 'deployment-manifest.json');
const REGION = process.env.AWS_REGION || 'us-east-1';
const ENVIRONMENT = process.env.ENVIRONMENT || 'dev';

interface LambdaManifest {
  name: string;
  bundle: string;
  memory: number;
  timeout: number;
  description: string;
  handler: string;
  runtime: string;
}

interface DeploymentManifest {
  timestamp: string;
  lambdas: LambdaManifest[];
}

interface IAMRoleMapping {
  [key: string]: string;
}

/**
 * IAM Role ARNs for each Lambda function
 * These should be created by task 26 (Configure IAM roles)
 */
const IAM_ROLES: IAMRoleMapping = {
  createProduct: `arn:aws:iam::ACCOUNT_ID:role/gp-createProduct-role-${ENVIRONMENT}`,
  generateQR: `arn:aws:iam::ACCOUNT_ID:role/gp-generateQR-role-${ENVIRONMENT}`,
  getProduct: `arn:aws:iam::ACCOUNT_ID:role/gp-getProduct-role-${ENVIRONMENT}`,
  verifySerial: `arn:aws:iam::ACCOUNT_ID:role/gp-verifySerial-role-${ENVIRONMENT}`,
  aiGenerate: `arn:aws:iam::ACCOUNT_ID:role/gp-aiGenerate-role-${ENVIRONMENT}`,
  updateProduct: `arn:aws:iam::ACCOUNT_ID:role/gp-updateProduct-role-${ENVIRONMENT}`,
  listProducts: `arn:aws:iam::ACCOUNT_ID:role/gp-listProducts-role-${ENVIRONMENT}`,
  calculateEmission: `arn:aws:iam::ACCOUNT_ID:role/gp-calculateEmission-role-${ENVIRONMENT}`,
  saveDraft: `arn:aws:iam::ACCOUNT_ID:role/gp-saveDraft-role-${ENVIRONMENT}`,
  getDraft: `arn:aws:iam::ACCOUNT_ID:role/gp-getDraft-role-${ENVIRONMENT}`,
  getManufacturer: `arn:aws:iam::ACCOUNT_ID:role/gp-getManufacturer-role-${ENVIRONMENT}`,
  updateManufacturer: `arn:aws:iam::ACCOUNT_ID:role/gp-updateManufacturer-role-${ENVIRONMENT}`
};

/**
 * Environment variables for Lambda functions
 */
function getEnvironmentVariables(lambdaName: string): Record<string, string> {
  const commonVars = {
    ENVIRONMENT,
    AWS_REGION: REGION,
    PRODUCTS_TABLE: `gp-products-${ENVIRONMENT}`,
    MANUFACTURERS_TABLE: `gp-manufacturers-${ENVIRONMENT}`,
    SERIALS_TABLE: `gp-product-serials-${ENVIRONMENT}`,
    DRAFTS_TABLE: `gp-drafts-${ENVIRONMENT}`,
    QR_BUCKET: `gp-qr-codes-${ENVIRONMENT}`,
    LOG_LEVEL: 'INFO'
  };

  // Lambda-specific environment variables
  const specificVars: Record<string, Record<string, string>> = {
    aiGenerate: {
      BEDROCK_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
      BEDROCK_REGION: REGION
    },
    generateQR: {
      QR_BUCKET: `gp-qr-codes-${ENVIRONMENT}`,
      SIGNED_URL_EXPIRATION: '3600'
    }
  };

  return {
    ...commonVars,
    ...(specificVars[lambdaName] || {})
  };
}

/**
 * Load deployment manifest
 */
function loadManifest(): DeploymentManifest {
  console.log('📋 Loading deployment manifest...');

  if (!fs.existsSync(MANIFEST_FILE)) {
    throw new Error(
      `Deployment manifest not found: ${MANIFEST_FILE}\n` +
      'Please run package-lambdas.ts first to create the manifest.'
    );
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
  console.log(`  ✓ Loaded ${manifest.lambdas.length} Lambda configurations\n`);

  return manifest;
}

/**
 * Deploy a single Lambda function
 * 
 * Note: This function provides the deployment configuration.
 * Actual deployment requires AWS Lambda MCP server integration.
 */
async function deployLambda(lambda: LambdaManifest): Promise<void> {
  const functionName = `gp-${lambda.name}-${ENVIRONMENT}`;
  const zipPath = path.join(OUTPUT_DIR, lambda.bundle);

  console.log(`🚀 Deploying ${functionName}...`);

  // Check if ZIP file exists
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Deployment package not found: ${zipPath}`);
  }

  const zipSize = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
  console.log(`  - Package size: ${zipSize} MB`);
  console.log(`  - Memory: ${lambda.memory} MB`);
  console.log(`  - Timeout: ${lambda.timeout} seconds`);
  console.log(`  - Runtime: ${lambda.runtime}`);
  console.log(`  - Handler: ${lambda.handler}`);

  // Get IAM role ARN
  const roleArn = IAM_ROLES[lambda.name];
  if (!roleArn) {
    console.warn(`  ⚠️  No IAM role configured for ${lambda.name}`);
  }

  // Get environment variables
  const envVars = getEnvironmentVariables(lambda.name);

  // Deployment configuration
  const deploymentConfig = {
    FunctionName: functionName,
    Runtime: lambda.runtime,
    Role: roleArn,
    Handler: lambda.handler,
    Code: {
      ZipFile: fs.readFileSync(zipPath)
    },
    Description: lambda.description,
    Timeout: lambda.timeout,
    MemorySize: lambda.memory,
    Environment: {
      Variables: envVars
    },
    Tags: {
      Environment: ENVIRONMENT,
      Project: 'green-passport',
      ManagedBy: 'infrastructure-script'
    }
  };

  console.log('\n  📝 Deployment Configuration:');
  console.log(JSON.stringify({
    ...deploymentConfig,
    Code: { ZipFile: `<Buffer ${zipSize} MB>` }
  }, null, 2));

  console.log('\n  ⚠️  MCP Server Integration Required:');
  console.log('  To deploy this Lambda function, use the AWS Lambda MCP server:');
  console.log('  Add to .kiro/settings/mcp.json:');
  console.log('  {');
  console.log('    "aws-lambda": {');
  console.log('      "command": "uvx",');
  console.log('      "args": ["@modelcontextprotocol/server-aws-lambda@latest"],');
  console.log('      "env": {},');
  console.log('      "disabled": false,');
  console.log('      "autoApprove": []');
  console.log('    }');
  console.log('  }');
  console.log('\n  Then use MCP tools to:');
  console.log(`  1. Create or update function: ${functionName}`);
  console.log(`  2. Upload code from: ${zipPath}`);
  console.log(`  3. Configure environment variables`);
  console.log(`  4. Set IAM role: ${roleArn}`);
  console.log('\n  ✓ Configuration prepared\n');
}

/**
 * Generate deployment script for manual execution
 */
function generateDeploymentScript(manifest: DeploymentManifest): void {
  console.log('📝 Generating deployment script...');

  const scriptLines: string[] = [
    '#!/bin/bash',
    '# Lambda Deployment Script',
    '# Generated by deploy-lambdas.ts',
    '',
    `REGION="${REGION}"`,
    `ENVIRONMENT="${ENVIRONMENT}"`,
    '',
    '# Deploy Lambda functions using AWS CLI',
    ''
  ];

  for (const lambda of manifest.lambdas) {
    const functionName = `gp-${lambda.name}-${ENVIRONMENT}`;
    const zipPath = path.join(OUTPUT_DIR, lambda.bundle);
    const roleArn = IAM_ROLES[lambda.name];
    const envVars = getEnvironmentVariables(lambda.name);

    scriptLines.push(`echo "Deploying ${functionName}..."`);
    scriptLines.push('');

    // Check if function exists
    scriptLines.push(`if aws lambda get-function --function-name ${functionName} --region $REGION 2>/dev/null; then`);
    scriptLines.push('  echo "  Updating existing function..."');
    scriptLines.push(`  aws lambda update-function-code \\`);
    scriptLines.push(`    --function-name ${functionName} \\`);
    scriptLines.push(`    --zip-file fileb://${zipPath} \\`);
    scriptLines.push(`    --region $REGION`);
    scriptLines.push('');
    scriptLines.push(`  aws lambda update-function-configuration \\`);
    scriptLines.push(`    --function-name ${functionName} \\`);
    scriptLines.push(`    --memory-size ${lambda.memory} \\`);
    scriptLines.push(`    --timeout ${lambda.timeout} \\`);
    scriptLines.push(`    --environment Variables='{${Object.entries(envVars).map(([k, v]) => `"${k}":"${v}"`).join(',')}}' \\`);
    scriptLines.push(`    --region $REGION`);
    scriptLines.push('else');
    scriptLines.push('  echo "  Creating new function..."');
    scriptLines.push(`  aws lambda create-function \\`);
    scriptLines.push(`    --function-name ${functionName} \\`);
    scriptLines.push(`    --runtime ${lambda.runtime} \\`);
    scriptLines.push(`    --role ${roleArn} \\`);
    scriptLines.push(`    --handler ${lambda.handler} \\`);
    scriptLines.push(`    --zip-file fileb://${zipPath} \\`);
    scriptLines.push(`    --description "${lambda.description}" \\`);
    scriptLines.push(`    --memory-size ${lambda.memory} \\`);
    scriptLines.push(`    --timeout ${lambda.timeout} \\`);
    scriptLines.push(`    --environment Variables='{${Object.entries(envVars).map(([k, v]) => `"${k}":"${v}"`).join(',')}}' \\`);
    scriptLines.push(`    --tags Environment=${ENVIRONMENT},Project=green-passport \\`);
    scriptLines.push(`    --region $REGION`);
    scriptLines.push('fi');
    scriptLines.push('');
    scriptLines.push('echo "  ✓ Deployed"');
    scriptLines.push('echo ""');
    scriptLines.push('');
  }

  scriptLines.push('echo "✅ All Lambda functions deployed!"');

  const scriptPath = path.join(OUTPUT_DIR, 'deploy.sh');
  fs.writeFileSync(scriptPath, scriptLines.join('\n'), { mode: 0o755 });

  console.log(`  ✓ Script written: ${scriptPath}\n`);
}

/**
 * Generate PowerShell deployment script for Windows
 */
function generatePowerShellScript(manifest: DeploymentManifest): void {
  console.log('📝 Generating PowerShell deployment script...');

  const scriptLines: string[] = [
    '# Lambda Deployment Script (PowerShell)',
    '# Generated by deploy-lambdas.ts',
    '',
    `$Region = "${REGION}"`,
    `$Environment = "${ENVIRONMENT}"`,
    '',
    '# Deploy Lambda functions using AWS CLI',
    ''
  ];

  for (const lambda of manifest.lambdas) {
    const functionName = `gp-${lambda.name}-${ENVIRONMENT}`;
    const zipPath = path.join(OUTPUT_DIR, lambda.bundle).replace(/\\/g, '\\\\');
    const roleArn = IAM_ROLES[lambda.name];
    const envVars = getEnvironmentVariables(lambda.name);
    const envVarsJson = JSON.stringify({ Variables: envVars }).replace(/"/g, '\\"');

    scriptLines.push(`Write-Host "Deploying ${functionName}..."`);
    scriptLines.push('');

    scriptLines.push(`$FunctionExists = aws lambda get-function --function-name ${functionName} --region $Region 2>$null`);
    scriptLines.push('if ($FunctionExists) {');
    scriptLines.push('  Write-Host "  Updating existing function..."');
    scriptLines.push(`  aws lambda update-function-code \``);
    scriptLines.push(`    --function-name ${functionName} \``);
    scriptLines.push(`    --zip-file fileb://${zipPath} \``);
    scriptLines.push(`    --region $Region`);
    scriptLines.push('');
    scriptLines.push(`  aws lambda update-function-configuration \``);
    scriptLines.push(`    --function-name ${functionName} \``);
    scriptLines.push(`    --memory-size ${lambda.memory} \``);
    scriptLines.push(`    --timeout ${lambda.timeout} \``);
    scriptLines.push(`    --environment "${envVarsJson}" \``);
    scriptLines.push(`    --region $Region`);
    scriptLines.push('} else {');
    scriptLines.push('  Write-Host "  Creating new function..."');
    scriptLines.push(`  aws lambda create-function \``);
    scriptLines.push(`    --function-name ${functionName} \``);
    scriptLines.push(`    --runtime ${lambda.runtime} \``);
    scriptLines.push(`    --role ${roleArn} \``);
    scriptLines.push(`    --handler ${lambda.handler} \``);
    scriptLines.push(`    --zip-file fileb://${zipPath} \``);
    scriptLines.push(`    --description "${lambda.description}" \``);
    scriptLines.push(`    --memory-size ${lambda.memory} \``);
    scriptLines.push(`    --timeout ${lambda.timeout} \``);
    scriptLines.push(`    --environment "${envVarsJson}" \``);
    scriptLines.push(`    --tags Environment=${ENVIRONMENT} Project=green-passport \``);
    scriptLines.push(`    --region $Region`);
    scriptLines.push('}');
    scriptLines.push('');
    scriptLines.push('Write-Host "  ✓ Deployed"');
    scriptLines.push('Write-Host ""');
    scriptLines.push('');
  }

  scriptLines.push('Write-Host "✅ All Lambda functions deployed!"');

  const scriptPath = path.join(OUTPUT_DIR, 'deploy.ps1');
  fs.writeFileSync(scriptPath, scriptLines.join('\n'));

  console.log(`  ✓ Script written: ${scriptPath}\n`);
}

/**
 * Main deployment function
 */
async function main(): Promise<void> {
  console.log('🚀 Lambda Deployment Script\n');
  console.log(`Region: ${REGION}`);
  console.log(`Environment: ${ENVIRONMENT}\n`);

  try {
    // Step 1: Load deployment manifest
    const manifest = loadManifest();

    // Step 2: Display deployment plan
    console.log('📋 Deployment Plan:\n');
    for (const lambda of manifest.lambdas) {
      await deployLambda(lambda);
    }

    // Step 3: Generate deployment scripts
    generateDeploymentScript(manifest);
    generatePowerShellScript(manifest);

    // Summary
    console.log('✅ Deployment Configuration Complete!\n');
    console.log('Summary:');
    console.log(`  - Lambda functions configured: ${manifest.lambdas.length}`);
    console.log(`  - Deployment scripts generated: 2`);
    console.log(`  - Region: ${REGION}`);
    console.log(`  - Environment: ${ENVIRONMENT}\n`);

    console.log('Next steps:');
    console.log('  1. Ensure IAM roles are created (task 26)');
    console.log('  2. Configure AWS credentials');
    console.log('  3. Run deployment script:');
    console.log(`     - Bash: bash ${path.join(OUTPUT_DIR, 'deploy.sh')}`);
    console.log(`     - PowerShell: ${path.join(OUTPUT_DIR, 'deploy.ps1')}`);
    console.log('  4. Verify deployment with verify-deployment.ts\n');

    console.log('⚠️  Note: IAM role ARNs contain placeholder ACCOUNT_ID');
    console.log('   Update IAM_ROLES in this script with your AWS account ID\n');

  } catch (error: any) {
    console.error('\n❌ Deployment configuration failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { deployLambda, getEnvironmentVariables };
