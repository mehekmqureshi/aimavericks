/**
 * Complete AWS Infrastructure Setup
 * Provisions all required AWS resources in the correct order
 */

import { execSync } from 'child_process';

const region = process.env.AWS_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'dev';

function runCommand(command: string, description: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${description}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    execSync(command, { stdio: 'inherit', env: { ...process.env, AWS_REGION: region, ENVIRONMENT: environment } });
    console.log(`\n✅ ${description} - COMPLETE\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${description} - FAILED\n`);
    return false;
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Green Passport AWS Infrastructure Setup                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nRegion: ${region}`);
  console.log(`Environment: ${environment}\n`);

  const steps = [
    {
      command: 'npx ts-node infrastructure/provision-dynamodb.ts',
      description: 'Step 1: Provision DynamoDB Tables'
    },
    {
      command: 'npx ts-node infrastructure/provision-s3.ts',
      description: 'Step 2: Provision S3 Buckets'
    },
    {
      command: 'npx ts-node infrastructure/provision-cognito-simple.ts',
      description: 'Step 3: Provision Cognito User Pool'
    },
    {
      command: 'npx ts-node infrastructure/seed-data.ts',
      description: 'Step 4: Seed Test Data'
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const step of steps) {
    const success = runCommand(step.command, step.description);
    if (success) {
      successCount++;
    } else {
      failCount++;
      console.log('\n⚠️  Continuing with remaining steps...\n');
    }
  }

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Setup Summary                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Successful: ${successCount}/${steps.length}`);
  console.log(`❌ Failed: ${failCount}/${steps.length}\n`);

  if (failCount === 0) {
    console.log('🎉 All infrastructure provisioned successfully!\n');
    console.log('Next steps:');
    console.log('  1. Create a test user: npx ts-node infrastructure/create-test-user.ts');
    console.log('  2. Deploy Lambda functions: npx ts-node infrastructure/deploy-lambdas.ts');
    console.log('  3. Set up API Gateway: npx ts-node infrastructure/provision-apigateway.ts\n');
  } else {
    console.log('⚠️  Some steps failed. Please review the errors above.\n');
  }
}

main().catch(console.error);
