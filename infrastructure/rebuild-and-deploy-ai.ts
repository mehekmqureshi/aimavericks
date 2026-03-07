/**
 * Rebuild and Deploy AI Generate Lambda
 * Compiles TypeScript and deploys the fixed Lambda function
 */

import { execSync } from 'child_process';
import { LambdaClient, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda';
import { readFileSync } from 'fs';

const region = 'us-east-1';
const client = new LambdaClient({ region });
const functionName = 'gp-aiGenerate-dev';

async function rebuildAndDeploy() {
  console.log('🔧 Rebuilding and deploying aiGenerate Lambda...\n');

  try {
    // Step 1: Compile TypeScript
    console.log('📦 Step 1: Compiling TypeScript...');
    execSync('npm run build:lambdas', { stdio: 'inherit' });
    console.log('✅ TypeScript compiled\n');

    // Step 2: Package Lambda
    console.log('📦 Step 2: Packaging Lambda...');
    execSync('cd dist/lambdas/aiGenerate && zip -r ../aiGenerate.zip .', { stdio: 'inherit' });
    console.log('✅ Lambda packaged\n');

    // Step 3: Deploy to AWS
    console.log('🚀 Step 3: Deploying to AWS...');
    const zipContent = readFileSync('dist/lambdas/aiGenerate.zip');
    
    await client.send(
      new UpdateFunctionCodeCommand({
        FunctionName: functionName,
        ZipFile: zipContent,
      })
    );
    console.log('✅ Lambda deployed\n');

    console.log('🎉 aiGenerate Lambda successfully rebuilt and deployed!\n');
    console.log('Test the endpoint:');
    console.log('  POST https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod/ai/generate');
    console.log('  Body: { "productName": "Test Product", "category": "Apparel" }\n');

  } catch (error) {
    console.error('❌ Failed to rebuild and deploy:', error);
    throw error;
  }
}

rebuildAndDeploy().catch(console.error);
