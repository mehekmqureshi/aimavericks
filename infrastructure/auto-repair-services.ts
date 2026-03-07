#!/usr/bin/env node
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface RepairAction {
  service: string;
  action: string;
  script: string;
  description: string;
}

const repairActions: RepairAction[] = [
  {
    service: 'Bedrock',
    action: 'verify-access',
    script: 'verify-bedrock-access.ts',
    description: 'Verify IAM permissions for Bedrock access',
  },
  {
    service: 'SageMaker',
    action: 'provision-endpoint',
    script: 'provision-sagemaker.ts',
    description: 'Create and deploy SageMaker endpoint',
  },
  {
    service: 'Lambda',
    action: 'deploy-functions',
    script: 'deploy-lambdas.ts',
    description: 'Deploy all Lambda functions with proper configuration',
  },
  {
    service: 'DynamoDB',
    action: 'provision-tables',
    script: 'provision-dynamodb.ts',
    description: 'Create DynamoDB tables with proper schema',
  },
  {
    service: 'S3',
    action: 'provision-buckets',
    script: 'provision-s3.ts',
    description: 'Create S3 buckets with proper permissions',
  },
  {
    service: 'Cognito',
    action: 'provision-auth',
    script: 'provision-cognito-simple.ts',
    description: 'Configure Cognito user pool and client',
  },
];

async function runRepairScript(script: string): Promise<boolean> {
  try {
    console.log(`  Running: ${script}`);
    execSync(`npx tsx ${script}`, {
      cwd: __dirname,
      stdio: 'inherit',
    });
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to run ${script}`);
    return false;
  }
}

async function repairService(service: string): Promise<boolean> {
  const action = repairActions.find(a => a.service === service);
  
  if (!action) {
    console.log(`  No automated repair available for ${service}`);
    return false;
  }

  console.log(`\n🔧 Repairing ${service}...`);
  console.log(`  ${action.description}`);
  
  const scriptPath = path.join(__dirname, action.script);
  if (!fs.existsSync(scriptPath)) {
    console.log(`  ✗ Repair script not found: ${action.script}`);
    return false;
  }

  return await runRepairScript(action.script);
}

async function main() {
  const args = process.argv.slice(2);
  
  console.log('🔧 AWS Services Auto-Repair Tool');
  console.log('=================================\n');

  if (args.length === 0) {
    console.log('Usage: npx tsx auto-repair-services.ts <service1> [service2] ...');
    console.log('\nAvailable services:');
    repairActions.forEach(action => {
      console.log(`  - ${action.service}: ${action.description}`);
    });
    console.log('\nExample: npx tsx auto-repair-services.ts Lambda DynamoDB S3');
    console.log('Or repair all: npx tsx auto-repair-services.ts all');
    process.exit(0);
  }

  const servicesToRepair = args[0].toLowerCase() === 'all' 
    ? repairActions.map(a => a.service)
    : args;

  const results: { service: string; success: boolean }[] = [];

  for (const service of servicesToRepair) {
    const success = await repairService(service);
    results.push({ service, success });
  }

  // Summary
  console.log('\n=== Repair Summary ===');
  results.forEach(({ service, success }) => {
    const icon = success ? '✓' : '✗';
    console.log(`${icon} ${service}: ${success ? 'Repaired' : 'Failed'}`);
  });

  const allSuccess = results.every(r => r.success);
  if (allSuccess) {
    console.log('\n✅ All repairs completed successfully!');
    console.log('Run validate-services to verify fixes.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some repairs failed. Review the output above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
