/**
 * API Gateway Provisioning Script
 * 
 * This script provisions an AWS API Gateway REST API for the Green Passport platform
 * with JWT authorization, CORS configuration, and rate limiting.
 * 
 * Requirements: 20.1, 20.2, 20.3, 20.5, 27.1, 1.3, 3.1.6
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
  CreateUsagePlanCommand,
  CreateApiKeyCommand,
  CreateUsagePlanKeyCommand,
} from '@aws-sdk/client-api-gateway';

interface APIGatewayConfig {
  apiName: string;
  region: string;
  environment: string;
  cognitoUserPoolArn: string;
  lambdaFunctions: {
    createProduct: string;
    listProducts: string;
    getProduct: string;
    updateProduct: string;
    generateQR: string;
    verifySerial: string;
    aiGenerate: string;
    calculateEmission: string;
    saveDraft: string;
    getDraft: string;
  };
  corsOrigins?: string[];
}

interface APIGatewayProvisioningResult {
  apiId: string;
  apiArn: string;
  apiEndpoint: string;
  stageName: string;
  authorizerId: string;
}

interface RouteConfig {
  path: string;
  method: string;
  lambdaArn: string;
  requiresAuth: boolean;
  pathParameters?: string[];
}

/**
 * Provisions an API Gateway REST API with the following configuration:
 * - JWT authorizer linked to Cognito User Pool
 * - CORS enabled for all routes
 * - Rate limiting: 100 req/s, burst 200
 * - All required routes for the Green Passport platform
 */
export async function provisionAPIGateway(
  config: APIGatewayConfig
): Promise<APIGatewayProvisioningResult> {
  const { apiName, region, environment, cognitoUserPoolArn, lambdaFunctions, corsOrigins } = config;
  const client = new APIGatewayClient({ region });

  console.log(`Provisioning API Gateway: ${apiName}`);
  console.log(`Region: ${region}`);
  console.log(`Environment: ${environment}`);

  try {
    // Step 1: Create REST API
    console.log('\n📝 Step 1: Creating REST API...');
    const createApiResponse = await client.send(
      new CreateRestApiCommand({
        name: `${apiName}-${environment}`,
        description: 'Green Passport Platform REST API',
        endpointConfiguration: {
          types: ['REGIONAL'],
        },
      })
    );

    const apiId = createApiResponse.id!;
    const apiArn = `arn:aws:apigateway:${region}::/restapis/${apiId}`;
    console.log(`✅ REST API created: ${apiId}`);

    // Step 2: Get root resource
    console.log('\n📝 Step 2: Getting root resource...');
    const resourcesResponse = await client.send(
      new GetResourcesCommand({ restApiId: apiId })
    );
    const rootResourceId = resourcesResponse.items?.find((r) => r.path === '/')?.id!;
    console.log(`✅ Root resource ID: ${rootResourceId}`);

    // Step 3: Create JWT Authorizer
    console.log('\n📝 Step 3: Creating JWT Authorizer...');
    const authorizerResponse = await client.send(
      new CreateAuthorizerCommand({
        restApiId: apiId,
        name: 'CognitoAuthorizer',
        type: 'COGNITO_USER_POOLS',
        providerARNs: [cognitoUserPoolArn],
        identitySource: 'method.request.header.Authorization',
      })
    );
    const authorizerId = authorizerResponse.id!;
    console.log(`✅ JWT Authorizer created: ${authorizerId}`);

    // Step 4: Create resources and methods
    console.log('\n📝 Step 4: Creating API resources and methods...');
    
    const routes: RouteConfig[] = [
      // Products routes
      { path: '/products', method: 'POST', lambdaArn: lambdaFunctions.createProduct, requiresAuth: true },
      { path: '/products', method: 'GET', lambdaArn: lambdaFunctions.listProducts, requiresAuth: true },
      { path: '/products/{productId}', method: 'GET', lambdaArn: lambdaFunctions.getProduct, requiresAuth: false, pathParameters: ['productId'] },
      { path: '/products/{productId}', method: 'PUT', lambdaArn: lambdaFunctions.updateProduct, requiresAuth: true, pathParameters: ['productId'] },
      
      // QR generation route
      { path: '/qr/generate', method: 'POST', lambdaArn: lambdaFunctions.generateQR, requiresAuth: true },
      
      // Verification route (public)
      { path: '/verify/{serialId}', method: 'GET', lambdaArn: lambdaFunctions.verifySerial, requiresAuth: false, pathParameters: ['serialId'] },
      
      // AI generation route
      { path: '/ai/generate', method: 'POST', lambdaArn: lambdaFunctions.aiGenerate, requiresAuth: true },
      
      // Real-time calculation route
      { path: '/calculate/emission', method: 'POST', lambdaArn: lambdaFunctions.calculateEmission, requiresAuth: true },
      
      // Draft routes
      { path: '/drafts', method: 'POST', lambdaArn: lambdaFunctions.saveDraft, requiresAuth: true },
      { path: '/drafts/{draftId}', method: 'GET', lambdaArn: lambdaFunctions.getDraft, requiresAuth: true, pathParameters: ['draftId'] },
    ];

    const createdResources = new Map<string, string>();
    createdResources.set('/', rootResourceId);

    for (const route of routes) {
      await createRouteWithCORS(
        client,
        apiId,
        route,
        authorizerId,
        createdResources,
        corsOrigins || ['*']
      );
    }

    console.log(`✅ All routes created successfully`);

    // Step 5: Deploy to production stage
    console.log('\n📝 Step 5: Deploying to production stage...');
    const deploymentResponse = await client.send(
      new CreateDeploymentCommand({
        restApiId: apiId,
        stageName: 'prod',
        description: `Deployment for ${environment} environment`,
      })
    );
    console.log(`✅ Deployment created: ${deploymentResponse.id}`);

    // Step 6: Configure rate limiting
    console.log('\n📝 Step 6: Configuring rate limiting...');
    await client.send(
      new UpdateStageCommand({
        restApiId: apiId,
        stageName: 'prod',
        patchOperations: [
          {
            op: 'replace',
            path: '/throttle/rateLimit',
            value: '100', // 100 requests per second
          },
          {
            op: 'replace',
            path: '/throttle/burstLimit',
            value: '200', // 200 burst limit
          },
        ],
      })
    );
    console.log(`✅ Rate limiting configured: 100 req/s, burst 200`);

    const apiEndpoint = `https://${apiId}.execute-api.${region}.amazonaws.com/prod`;

    console.log('\n✅ API Gateway provisioning complete!');
    console.log(`API Endpoint: ${apiEndpoint}`);

    return {
      apiId,
      apiArn,
      apiEndpoint,
      stageName: 'prod',
      authorizerId,
    };
  } catch (error) {
    console.error('❌ Error provisioning API Gateway:', error);
    throw error;
  }
}

/**
 * Creates a route with CORS support
 */
async function createRouteWithCORS(
  client: APIGatewayClient,
  apiId: string,
  route: RouteConfig,
  authorizerId: string,
  createdResources: Map<string, string>,
  corsOrigins: string[]
): Promise<void> {
  const { path, method, lambdaArn, requiresAuth, pathParameters } = route;

  console.log(`  Creating route: ${method} ${path}`);

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
      requestParameters: pathParameters?.reduce((acc, param) => {
        acc[`method.request.path.${param}`] = true;
        return acc;
      }, {} as Record<string, boolean>),
    })
  );

  // Create Lambda integration
  await client.send(
    new PutIntegrationCommand({
      restApiId: apiId,
      resourceId,
      httpMethod: method,
      type: 'AWS_PROXY',
      integrationHttpMethod: 'POST',
      uri: `arn:aws:apigateway:${client.config.region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`,
      requestParameters: pathParameters?.reduce((acc, param) => {
        acc[`integration.request.path.${param}`] = `method.request.path.${param}`;
        return acc;
      }, {} as Record<string, string>),
    })
  );

  // Create method response
  await client.send(
    new PutMethodResponseCommand({
      restApiId: apiId,
      resourceId,
      httpMethod: method,
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': true,
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
      },
    })
  );

  // Create integration response
  await client.send(
    new PutIntegrationResponseCommand({
      restApiId: apiId,
      resourceId,
      httpMethod: method,
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': `'${corsOrigins.join(',')}'`,
        'method.response.header.Access-Control-Allow-Headers': "'Authorization,Content-Type'",
        'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,OPTIONS'",
      },
    })
  );

  // Create OPTIONS method for CORS preflight
  await createCORSPreflightMethod(client, apiId, resourceId, corsOrigins);

  console.log(`  ✅ Route created: ${method} ${path}`);
}

/**
 * Creates resource hierarchy for a path
 */
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

/**
 * Creates OPTIONS method for CORS preflight
 */
async function createCORSPreflightMethod(
  client: APIGatewayClient,
  apiId: string,
  resourceId: string,
  corsOrigins: string[]
): Promise<void> {
  // Create OPTIONS method
  await client.send(
    new PutMethodCommand({
      restApiId: apiId,
      resourceId,
      httpMethod: 'OPTIONS',
      authorizationType: 'NONE',
    })
  );

  // Create MOCK integration
  await client.send(
    new PutIntegrationCommand({
      restApiId: apiId,
      resourceId,
      httpMethod: 'OPTIONS',
      type: 'MOCK',
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    })
  );

  // Create method response
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

  // Create integration response
  await client.send(
    new PutIntegrationResponseCommand({
      restApiId: apiId,
      resourceId,
      httpMethod: 'OPTIONS',
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': `'${corsOrigins.join(',')}'`,
        'method.response.header.Access-Control-Allow-Headers': "'Authorization,Content-Type'",
        'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,OPTIONS'",
      },
    })
  );
}

/**
 * Main execution function
 */
async function main() {
  const config: APIGatewayConfig = {
    apiName: 'green-passport-api',
    region: process.env.AWS_REGION || 'us-east-1',
    environment: process.env.ENVIRONMENT || 'dev',
    cognitoUserPoolArn: process.env.COGNITO_USER_POOL_ARN || 'PLACEHOLDER_COGNITO_ARN',
    lambdaFunctions: {
      createProduct: process.env.LAMBDA_CREATE_PRODUCT_ARN || 'PLACEHOLDER_LAMBDA_ARN',
      listProducts: process.env.LAMBDA_LIST_PRODUCTS_ARN || 'PLACEHOLDER_LAMBDA_ARN',
      getProduct: process.env.LAMBDA_GET_PRODUCT_ARN || 'PLACEHOLDER_LAMBDA_ARN',
      updateProduct: process.env.LAMBDA_UPDATE_PRODUCT_ARN || 'PLACEHOLDER_LAMBDA_ARN',
      generateQR: process.env.LAMBDA_GENERATE_QR_ARN || 'PLACEHOLDER_LAMBDA_ARN',
      verifySerial: process.env.LAMBDA_VERIFY_SERIAL_ARN || 'PLACEHOLDER_LAMBDA_ARN',
      aiGenerate: process.env.LAMBDA_AI_GENERATE_ARN || 'PLACEHOLDER_LAMBDA_ARN',
      calculateEmission: process.env.LAMBDA_CALCULATE_EMISSION_ARN || 'PLACEHOLDER_LAMBDA_ARN',
      saveDraft: process.env.LAMBDA_SAVE_DRAFT_ARN || 'PLACEHOLDER_LAMBDA_ARN',
      getDraft: process.env.LAMBDA_GET_DRAFT_ARN || 'PLACEHOLDER_LAMBDA_ARN',
    },
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
  };

  try {
    const result = await provisionAPIGateway(config);
    console.log('\n✅ API Gateway provisioning complete');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    console.log('\n📋 Next Steps:');
    console.log('1. Grant API Gateway permission to invoke Lambda functions:');
    console.log('   aws lambda add-permission --function-name <FUNCTION_NAME> \\');
    console.log(`     --statement-id apigateway-invoke --action lambda:InvokeFunction \\`);
    console.log(`     --principal apigateway.amazonaws.com \\`);
    console.log(`     --source-arn "${result.apiArn}/*"`);
    console.log('2. Update CloudFront distribution to use the API endpoint');
    console.log('3. Test API endpoints with authentication tokens');
  } catch (error) {
    console.error('❌ Error provisioning API Gateway:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
