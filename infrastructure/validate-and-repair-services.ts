#!/usr/bin/env node
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
} from '@aws-sdk/client-sagemaker-runtime';
import { SageMakerClient, DescribeEndpointCommand } from '@aws-sdk/client-sagemaker';
import {
  LambdaClient,
  GetFunctionConcurrencyCommand,
  PutFunctionConcurrencyCommand,
  GetFunctionCommand,
} from '@aws-sdk/client-lambda';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const region = process.env.AWS_REGION || 'us-east-1';

interface ValidationResult {
  service: string;
  status: 'PASS' | 'FAIL' | 'REPAIRED';
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

// Utility function to add result
function addResult(service: string, status: 'PASS' | 'FAIL' | 'REPAIRED', message: string, details?: any) {
  results.push({ service, status, message, details });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '🔧';
  console.log(`${icon} ${service}: ${message}`);
  if (details) {
    console.log(`  Details:`, JSON.stringify(details, null, 2));
  }
}

// 1. Validate Bedrock Connectivity
async function validateBedrock(): Promise<void> {
  console.log('\n=== Validating Bedrock Connectivity ===');
  try {
    const client = new BedrockRuntimeClient({ region });
    // Use Amazon Titan Text G1 - Express which is generally available
    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-text-lite-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: 'Test',
        textGenerationConfig: {
          maxTokenCount: 10,
          temperature: 0.1,
        },
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    addResult('Bedrock', 'PASS', 'Successfully connected and invoked model', {
      modelId: 'amazon.titan-text-lite-v1',
      responseLength: responseBody.results?.[0]?.outputText?.length || 0,
    });
  } catch (error: any) {
    // Try to provide helpful guidance based on error
    let suggestion = 'Check IAM permissions for bedrock:InvokeModel';
    if (error.message?.includes('use case details')) {
      suggestion = 'Enable model access in AWS Bedrock console (Model access page)';
    } else if (error.message?.includes('end of its life')) {
      suggestion = 'Model deprecated - enable a different model in Bedrock console';
    }
    
    addResult('Bedrock', 'FAIL', `Connection failed: ${error.message}`, {
      errorCode: error.name,
      suggestion,
    });
  }
}

// 2. Validate SageMaker Endpoint
async function validateSageMaker(): Promise<void> {
  console.log('\n=== Validating SageMaker Endpoint ===');
  const endpointName = process.env.SAGEMAKER_ENDPOINT_NAME || 'gp-carbon-predictor';
  
  try {
    const client = new SageMakerClient({ region });
    const describeCommand = new DescribeEndpointCommand({ EndpointName: endpointName });
    const endpoint = await client.send(describeCommand);

    if (endpoint.EndpointStatus === 'InService') {
      // Test invocation
      const runtimeClient = new SageMakerRuntimeClient({ region });
      const invokeCommand = new InvokeEndpointCommand({
        EndpointName: endpointName,
        ContentType: 'application/json',
        Body: JSON.stringify({
          instances: [[100, 50, 10, 5, 1]],
        }),
      });

      const response = await runtimeClient.send(invokeCommand);
      const result = JSON.parse(new TextDecoder().decode(response.Body));
      
      addResult('SageMaker', 'PASS', 'Endpoint active and responding', {
        endpointName,
        status: endpoint.EndpointStatus,
        instanceType: endpoint.InstanceType,
        prediction: result,
      });
    } else {
      addResult('SageMaker', 'FAIL', `Endpoint not in service: ${endpoint.EndpointStatus}`, {
        endpointName,
        status: endpoint.EndpointStatus,
        suggestion: 'Wait for endpoint to reach InService status or redeploy',
      });
    }
  } catch (error: any) {
    addResult('SageMaker', 'FAIL', `Endpoint validation failed: ${error.message}`, {
      endpointName,
      errorCode: error.name,
      suggestion: 'Run provision-sagemaker.ts to create endpoint',
    });
  }
}

// 3. Validate Lambda Concurrency
async function validateLambdaConcurrency(): Promise<void> {
  console.log('\n=== Validating Lambda Concurrency ===');
  const lambdaFunctions = [
    'gp-createProduct-dev',
    'gp-getProduct-dev',
    'gp-listProducts-dev',
    'gp-updateProduct-dev',
    'gp-aiGenerate-dev',
    'gp-calculateEmission-dev',
    'gp-generateQR-dev',
    'gp-verifySerial-dev',
  ];

  const client = new LambdaClient({ region });
  
  for (const funcName of lambdaFunctions) {
    try {
      // Check if function exists
      const getCommand = new GetFunctionCommand({ FunctionName: funcName });
      await client.send(getCommand);

      // Check concurrency
      const concurrencyCommand = new GetFunctionConcurrencyCommand({ FunctionName: funcName });
      const concurrency = await client.send(concurrencyCommand);

      if (!concurrency.ReservedConcurrentExecutions) {
        // Try to set recommended concurrency, but skip if account limit reached
        try {
          const putCommand = new PutFunctionConcurrencyCommand({
            FunctionName: funcName,
            ReservedConcurrentExecutions: 10,
          });
          await client.send(putCommand);
          
          addResult(`Lambda:${funcName}`, 'REPAIRED', 'Set reserved concurrency to 10', {
            previousConcurrency: 'unreserved',
            newConcurrency: 10,
          });
        } catch (concurrencyError: any) {
          if (concurrencyError.message?.includes('UnreservedConcurrentExecution')) {
            addResult(`Lambda:${funcName}`, 'PASS', 'Function exists (concurrency at account limit)', {
              note: 'Skipped setting reserved concurrency due to account limits',
            });
          } else {
            throw concurrencyError;
          }
        }
      } else {
        addResult(`Lambda:${funcName}`, 'PASS', 'Concurrency configured', {
          reservedConcurrency: concurrency.ReservedConcurrentExecutions,
        });
      }
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        addResult(`Lambda:${funcName}`, 'FAIL', 'Function not found', {
          suggestion: 'Deploy lambda functions using deploy-lambdas.ts',
        });
      } else {
        addResult(`Lambda:${funcName}`, 'FAIL', `Validation failed: ${error.message}`);
      }
    }
  }
}

// 4. Validate DynamoDB Write/Read
async function validateDynamoDB(): Promise<void> {
  console.log('\n=== Validating DynamoDB Write/Read ===');
  const tables = [
    { name: process.env.PRODUCTS_TABLE_NAME || 'Products', key: 'productId' },
    { name: process.env.MANUFACTURERS_TABLE_NAME || 'Manufacturers', key: 'manufacturerId' },
    { name: process.env.PRODUCT_SERIALS_TABLE_NAME || 'ProductSerials', key: 'serialId' },
  ];

  const client = new DynamoDBClient({ region });
  
  for (const table of tables) {
    const testId = `test-${Date.now()}`;
    
    try {
      // Test Write
      const putCommand = new PutItemCommand({
        TableName: table.name,
        Item: {
          [table.key]: { S: testId },
          testData: { S: 'validation-test' },
          timestamp: { N: Date.now().toString() },
        },
      });
      await client.send(putCommand);

      // Test Read
      const getCommand = new GetItemCommand({
        TableName: table.name,
        Key: {
          [table.key]: { S: testId },
        },
      });
      const result = await client.send(getCommand);

      // Cleanup
      const deleteCommand = new DeleteItemCommand({
        TableName: table.name,
        Key: {
          [table.key]: { S: testId },
        },
      });
      await client.send(deleteCommand);

      if (result.Item) {
        addResult(`DynamoDB:${table.name}`, 'PASS', 'Write and read successful', {
          tableName: table.name,
          testId,
        });
      } else {
        addResult(`DynamoDB:${table.name}`, 'FAIL', 'Read returned no data');
      }
    } catch (error: any) {
      addResult(`DynamoDB:${table.name}`, 'FAIL', `Operation failed: ${error.message}`, {
        errorCode: error.name,
        suggestion: 'Run provision-dynamodb.ts to create tables',
      });
    }
  }
}

// 5. Validate S3 Object Access
async function validateS3(): Promise<void> {
  console.log('\n=== Validating S3 Object Access ===');
  const buckets = [
    process.env.QR_CODES_BUCKET || 'gp-qr-codes-565164711676-dev',
    process.env.FRONTEND_BUCKET || 'gp-frontend-prod-2026',
  ];

  const client = new S3Client({ region });
  
  for (const bucket of buckets) {
    const testKey = `test-validation-${Date.now()}.txt`;
    const testContent = 'S3 validation test';
    
    try {
      // Check bucket exists
      await client.send(new HeadBucketCommand({ Bucket: bucket }));

      // Test Write
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain',
      }));

      // Test Read
      const getResponse = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: testKey,
      }));
      const content = await getResponse.Body?.transformToString();

      // Cleanup
      await client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: testKey,
      }));

      if (content === testContent) {
        addResult(`S3:${bucket}`, 'PASS', 'Write and read successful', {
          bucket,
          testKey,
        });
      } else {
        addResult(`S3:${bucket}`, 'FAIL', 'Read content mismatch');
      }
    } catch (error: any) {
      addResult(`S3:${bucket}`, 'FAIL', `Operation failed: ${error.message}`, {
        bucket,
        errorCode: error.name,
        suggestion: 'Run provision-s3.ts to create buckets',
      });
    }
  }
}

// 6. Validate Cognito Login Flow
async function validateCognito(): Promise<void> {
  console.log('\n=== Validating Cognito Login Flow ===');
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  
  if (!userPoolId || !clientId) {
    addResult('Cognito', 'FAIL', 'Missing Cognito configuration', {
      userPoolId: userPoolId ? 'configured' : 'missing',
      clientId: clientId ? 'configured' : 'missing',
      suggestion: 'Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in .env',
    });
    return;
  }

  const client = new CognitoIdentityProviderClient({ region });
  const testUsername = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!@#';
  
  try {
    // Create test user
    await client.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: testUsername,
      TemporaryPassword: testPassword,
      MessageAction: 'SUPPRESS',
    }));

    // Set permanent password
    await client.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: testUsername,
      Password: testPassword,
      Permanent: true,
    }));

    // Test authentication
    const authResponse = await client.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: {
        USERNAME: testUsername,
        PASSWORD: testPassword,
      },
    }));

    // Cleanup
    await client.send(new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: testUsername,
    }));

    if (authResponse.AuthenticationResult?.AccessToken) {
      addResult('Cognito', 'PASS', 'Login flow successful', {
        userPoolId,
        testUsername,
        tokenReceived: true,
      });
    } else {
      addResult('Cognito', 'FAIL', 'Authentication did not return token');
    }
  } catch (error: any) {
    // Cleanup on error
    try {
      await client.send(new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: testUsername,
      }));
    } catch {}

    addResult('Cognito', 'FAIL', `Login flow failed: ${error.message}`, {
      errorCode: error.name,
      suggestion: 'Run provision-cognito-simple.ts to configure Cognito',
    });
  }
}

// Main execution
async function main() {
  console.log('🔍 AWS Services Validation & Repair Tool');
  console.log('=========================================\n');
  console.log(`Region: ${region}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Load .env file if it exists
  try {
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
    }
  } catch (error) {
    console.log('Note: Could not load .env file, using environment variables\n');
  }

  await validateBedrock();
  await validateSageMaker();
  await validateLambdaConcurrency();
  await validateDynamoDB();
  await validateS3();
  await validateCognito();

  // Summary
  console.log('\n=== Validation Summary ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const repaired = results.filter(r => r.status === 'REPAIRED').length;
  
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`🔧 Repaired: ${repaired}`);
  console.log(`Total: ${results.length}`);

  if (failed > 0) {
    console.log('\n⚠️  Some services require attention. Review the failures above.');
    process.exit(1);
  } else {
    console.log('\n✅ All services validated successfully!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
