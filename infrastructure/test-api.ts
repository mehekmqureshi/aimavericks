/**
 * Test API Gateway Endpoints
 */

import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-idp';

const REGION = 'us-east-1';
const USER_POOL_ID = 'us-east-1_QQ4WSYNbX';
const CLIENT_ID = '2md6sb5g5k31i4ejgr0tlvqq49';
const API_ENDPOINT = 'https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod';

async function testAPI() {
  console.log('🧪 Testing API Gateway Endpoints\n');

  try {
    // Step 1: Get Cognito token
    console.log('📝 Step 1: Authenticating with Cognito...');
    const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
    
    const authResponse = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: 'manufacturer@greenpassport.com',
          PASSWORD: 'Test123!',
        },
      })
    );

    const accessToken = authResponse.AuthenticationResult?.AccessToken;
    if (!accessToken) {
      throw new Error('No access token received');
    }
    console.log('✅ Authentication successful\n');

    // Step 2: Test GET /products (requires auth)
    console.log('📝 Step 2: Testing GET /products...');
    const productsResponse = await fetch(`${API_ENDPOINT}/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (productsResponse.ok) {
      const products = await productsResponse.json();
      console.log(`✅ GET /products: ${products.length} products found\n`);
    } else {
      console.log(`❌ GET /products: ${productsResponse.status} ${productsResponse.statusText}\n`);
    }

    // Step 3: Test GET /products/{productId} (public)
    console.log('📝 Step 3: Testing GET /products/PROD001...');
    const productResponse = await fetch(`${API_ENDPOINT}/products/PROD001`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (productResponse.ok) {
      const product = await productResponse.json();
      console.log(`✅ GET /products/PROD001: ${product.name}\n`);
    } else {
      console.log(`❌ GET /products/PROD001: ${productResponse.status} ${productResponse.statusText}\n`);
    }

    // Step 4: Test GET /manufacturer (requires auth)
    console.log('📝 Step 4: Testing GET /manufacturer...');
    const manufacturerResponse = await fetch(`${API_ENDPOINT}/manufacturer`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (manufacturerResponse.ok) {
      const manufacturer = await manufacturerResponse.json();
      console.log(`✅ GET /manufacturer: ${manufacturer.name}\n`);
    } else {
      console.log(`❌ GET /manufacturer: ${manufacturerResponse.status} ${manufacturerResponse.statusText}\n`);
    }

    console.log('🎉 API Gateway testing complete!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

testAPI().catch(console.error);
