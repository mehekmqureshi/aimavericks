/**
 * Complete API Gateway Deployment Script
 * Provisions API Gateway and connects it to existing Lambda functions
 */

import {
  APIGatewayClient,
  CreateRestApiCommand,
  GetResourcesCommand,
  CreateResourceCommand,
  PutMethodCommand,
  PutIntegrationCommand,
  PutMethodResponseCommand,
  PutIntegrationResponseCommand,
  CreateDeploymentCommand,
  CreateAuthorizerCommand,
  UpdateStageCommand,
} from '@aws-sdk/client-api-gateway';
import { LambdaClient, AddPermissionCommand } from '@aws-sdk/client-lambda';

const REGION = 'us-east-1';
const ENVIRONMENT = 'dev';
const ACCOUNT_ID = '565164711676';

// Cognito User Pool ARN
const COGNITO_USER_POOL_ARN = `arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/us-east-1_QQ4WSYNbX`;

// Lambda Function ARNs
const LAMBDA_ARNS = {
  createProduct: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-createProduct-${ENVIRONMENT}`,
  listProducts: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-listProducts-${ENVIRONMENT}`,
  getProduct: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-getProduct-${ENVIRONMENT}`,
  updateProduct: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-updateProduct-${ENVIRONMENT}`,
  generateQR: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-generateQR-${ENVIRONMENT}`,
  verifySerial: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-verifySerial-${ENVIRONMENT}`,
  aiGenerate: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-aiGenerate-${ENVIRONMENT}`,
  calculateEmission: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-calculateEmission-${ENVIRONMENT}`,
  saveDraft: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-saveDraft-${ENVIRONMENT}`,
  getDraft: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-getDraft-${ENVIRONMENT}`,
  getManufacturer: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-getManufacturer-${ENVIRONMENT}`,
  updateManufacturer: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:gp-updateManufacturer-${ENVIRONMENT}`,
};

interface Route {
  path: string;
  method: string;
  lambdaArn: string;
  requiresAuth: boolean;
}

async function deployAPIGateway() {
  const apiClient = new APIGatewayClient({ region: REGION });
  const lambdaClient = new LambdaClient({ region: REGION });

  console.log('🚀 Starting API Gateway Deployment');
  console.log(`Region: ${REGION}`);
  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(`Account: ${ACCOUNT_ID}\n`);

  try {
    // Step 1: Create REST API
    console.log('📝 Step 1: Creating REST API...');
    const createApiResponse = await apiClient.send(
      new CreateRestApiCommand({
        name: `green-passport-api-${ENVIRONMENT}`,
        description: 'Green Passport Platform REST API',
        endpointConfiguration: { types: ['REGIONAL'] },
      })
    );

    const apiId = createApiResponse.id!;
    console.log(`✅ API Created: ${apiId}\n`);

    // Step 2: Get root resource
    console.log('📝 Step 2: Getting root resource...');
    const resourcesResponse = await apiClient.send(
      new GetResourcesCommand({ restApiId: apiId })
    );
    const rootResourceId = resourcesResponse.items?.find((r) => r.path === '/')?.id!;
    console.log(`✅ Root Resource: ${rootResourceId}\n`);

    // Step 3: Create JWT Authorizer
    console.log('📝 Step 3: Creating Cognito Authorizer...');
    const authorizerResponse = await apiClient.send(
      new CreateAuthorizerCommand({
        restApiId: apiId,
        name: 'CognitoAuthorizer',
        type: 'COGNITO_USER_POOLS',
        providerARNs: [COGNITO_USER_POOL_ARN],
        identitySource: 'method.request.header.Authorization',
      })
    );
    const authorizerId = authorizerResponse.id!;
    console.log(`✅ Authorizer Created: ${authorizerId}\n`);

    // Step 4: Define routes
    const routes: Route[] = [
      // Products
      { path: '/products', method: 'POST', lambdaArn: LAMBDA_ARNS.createProduct, requiresAuth: true },
      { path: '/products', method: 'GET', lambdaArn: LAMBDA_ARNS.listProducts, requiresAuth: true },
      { path: '/products/{productId}', method: 'GET', lambdaArn: LAMBDA_ARNS.getProduct, requiresAuth: false },
      { path: '/products/{productId}', method: 'PUT', lambdaArn: LAMBDA_ARNS.updateProduct, requiresAuth: true },
      
      // QR & Verification
      { path: '/qr/generate', method: 'POST', lambdaArn: LAMBDA_ARNS.generateQR, requiresAuth: true },
      { path: '/verify/{serialId}', method: 'GET', lambdaArn: LAMBDA_ARNS.verifySerial, requiresAuth: false },
      
      // AI & Calculation
      { path: '/ai/generate', method: 'POST', lambdaArn: LAMBDA_ARNS.aiGenerate, requiresAuth: true },
      { path: '/calculate/emission', method: 'POST', lambdaArn: LAMBDA_ARNS.calculateEmission, requiresAuth: true },
      
      // Drafts
      { path: '/drafts', method: 'POST', lambdaArn: LAMBDA_ARNS.saveDraft, requiresAuth: true },
      { path: '/drafts/{draftId}', method: 'GET', lambdaArn: LAMBDA_ARNS.getDraft, requiresAuth: true },
      
      // Manufacturer
      { path: '/manufacturer', method: 'GET', lambdaArn: LAMBDA_ARNS.getManufacturer, requiresAuth: true },
      { path: '/manufacturer', method: 'PUT', lambdaArn: LAMBDA_ARNS.updateManufacturer, requiresAuth: true },
    ];

    // Step 5: Create resources and methods
    console.log('📝 Step 4: Creating API routes...');
    const createdResources = new Map<string, string>();
    createdResources.set('/', rootResourceId);

    for (const route of routes) {
      await createRoute(apiClient, apiId, route, authorizerId, createdResources);
    }
    console.log(`✅ Created ${routes.length} routes\n`);

    // Step 6: Deploy API
    console.log('📝 Step 5: Deploying API to prod stage...');
    await apiClient.send(
      new CreateDeploymentCommand({
        restApiId: apiId,
        stageName: 'prod',
        description: `Deployment for ${ENVIRONMENT} environment`,
      })
    );
    console.log('✅ API Deployed\n');

    // Step 7: Configure throttling
    console.log('📝 Step 6: Configuring rate limiting...');
    await apiClient.send(
      new UpdateStageCommand({
        restApiId: apiId,
        stageName: 'prod',
        patchOperations: [
          { op: 'replace', path: '/*/*/throttling/rateLimit', value: '100' },
          { op: 'replace', path: '/*/*/throttling/burstLimit', value: '200' },
        ],
      })
    );
    console.log('✅ Rate limiting: 100 req/s, burst 200\n');

    // Step 8: Grant Lambda permissions
    console.log('📝 Step 7: Granting Lambda invoke permissions...');
    const uniqueLambdas = [...new Set(routes.map(r => r.lambdaArn))];
    
    for (const lambdaArn of uniqueLambdas) {
      const functionName = lambdaArn.split(':').pop()!;
      try {
        await lambdaClient.send(
          new AddPermissionCommand({
            FunctionName: functionName,
            StatementId: `apigateway-${apiId}-invoke`,
            Action: 'lambda:InvokeFunction',
            Principal: 'apigateway.amazonaws.com',
            SourceArn: `arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${apiId}/*`,
          })
        );
        console.log(`  ✅ ${functionName}`);
      } catch (error: any) {
        if (error.name === 'ResourceConflictException') {
          console.log(`  ⚠️  ${functionName} (permission already exists)`);
        } else {
          throw error;
        }
      }
    }

    const apiEndpoint = `https://${apiId}.execute-api.${REGION}.amazonaws.com/prod`;

    console.log('\n🎉 API Gateway Deployment Complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`API ID: ${apiId}`);
    console.log(`API Endpoint: ${apiEndpoint}`);
    console.log(`Stage: prod`);
    console.log(`Authorizer ID: ${authorizerId}`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📋 Next Steps:');
    console.log(`1. Update frontend/.env with:`);
    console.log(`   VITE_API_GATEWAY_URL=${apiEndpoint}`);
    console.log('2. Test API endpoints');
    console.log('3. Verify authentication flow\n');

    return { apiId, apiEndpoint, authorizerId };
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

async function createRoute(
  client: APIGatewayClient,
  apiId: string,
  route: Route,
  authorizerId: string,
  createdResources: Map<string, string>
) {
  const { path, method, lambdaArn, requiresAuth } = route;
  
  // Create resource hierarchy
  const resourceId = await createResourceHierarchy(client, apiId, path, createdResources);

  // Create method
  await client.send(
    new PutMethodCommand({
      restApiId: apiId,
      resourceId,
      httpMethod: method,
      authorizationType: requiresAuth ? 'COGNITO_USER_POOLS' : 'NONE',
      authorizerId: requiresAuth ? authorizerId : undefined,
    })
  );

  // Create Lambda integration (AWS_PROXY)
  await client.send(
    new PutIntegrationCommand({
      restApiId: apiId,
      resourceId,
      httpMethod: method,
      type: 'AWS_PROXY',
      integrationHttpMethod: 'POST',
      uri: `arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`,
    })
  );

  // Create CORS preflight
  await createCORSPreflight(client, apiId, resourceId);

  console.log(`  ✅ ${method} ${path}`);
}

async function createResourceHierarchy(
  client: APIGatewayClient,
  apiId: string,
  path: string,
  createdResources: Map<string, string>
): Promise<string> {
  if (createdResources.has(path)) {
    return createdResources.get(path)!;
  }

  const parts = path.split('/').filter(Boolean);
  let currentPath = '';
  let parentId = createdResources.get('/')!;

  for (const part of parts) {
    currentPath += `/${part}`;
    
    if (!createdResources.has(currentPath)) {
      const response = await client.send(
        new CreateResourceCommand({
          restApiId: apiId,
          parentId,
          pathPart: part,
        })
      );
      createdResources.set(currentPath, response.id!);
    }
    
    parentId = createdResources.get(currentPath)!;
  }

  return parentId;
}

async function createCORSPreflight(
  client: APIGatewayClient,
  apiId: string,
  resourceId: string
) {
  try {
    await client.send(
      new PutMethodCommand({
        restApiId: apiId,
        resourceId,
        httpMethod: 'OPTIONS',
        authorizationType: 'NONE',
      })
    );

    await client.send(
      new PutIntegrationCommand({
        restApiId: apiId,
        resourceId,
        httpMethod: 'OPTIONS',
        type: 'MOCK',
        requestTemplates: { 'application/json': '{"statusCode": 200}' },
      })
    );

    await client.send(
      new PutMethodResponseCommand({
        restApiId: apiId,
        resourceId,
        httpMethod: 'OPTIONS',
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
        },
      })
    );

    await client.send(
      new PutIntegrationResponseCommand({
        restApiId: apiId,
        resourceId,
        httpMethod: 'OPTIONS',
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,OPTIONS'",
        },
      })
    );
  } catch (error) {
    // CORS preflight might already exist, ignore
  }
}

// Execute
deployAPIGateway().catch(console.error);
