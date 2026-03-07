#!/usr/bin/env node
/**
 * Quick validation script - runs essential checks only
 * Use this for fast pre-deployment validation
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';

const region = process.env.AWS_REGION || 'us-east-1';

async function quickCheck() {
  console.log('⚡ Quick AWS Services Check\n');
  
  let passed = 0;
  let failed = 0;

  // 1. Bedrock
  try {
    const client = new BedrockRuntimeClient({ region });
    await client.send(new InvokeModelCommand({
      modelId: 'amazon.titan-text-express-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: 'test',
        textGenerationConfig: { maxTokenCount: 5 },
      }),
    }));
    console.log('✓ Bedrock');
    passed++;
  } catch {
    console.log('✗ Bedrock');
    failed++;
  }

  // 2. DynamoDB
  try {
    const client = new DynamoDBClient({ region });
    await client.send(new DescribeTableCommand({
      TableName: process.env.PRODUCTS_TABLE_NAME || 'Products',
    }));
    console.log('✓ DynamoDB');
    passed++;
  } catch {
    console.log('✗ DynamoDB');
    failed++;
  }

  // 3. S3
  try {
    const client = new S3Client({ region });
    await client.send(new HeadBucketCommand({
      Bucket: process.env.QR_CODES_BUCKET || 'gp-qr-codes-production',
    }));
    console.log('✓ S3');
    passed++;
  } catch {
    console.log('✗ S3');
    failed++;
  }

  // 4. Lambda
  try {
    const client = new LambdaClient({ region });
    await client.send(new GetFunctionCommand({
      FunctionName: 'createProduct',
    }));
    console.log('✓ Lambda');
    passed++;
  } catch {
    console.log('✗ Lambda');
    failed++;
  }

  console.log(`\n${passed}/4 checks passed`);
  
  if (failed > 0) {
    console.log('\n⚠️  Run full validation: npm run validate:services');
    process.exit(1);
  } else {
    console.log('✅ All essential services ready');
    process.exit(0);
  }
}

quickCheck().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
