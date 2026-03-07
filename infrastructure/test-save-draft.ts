/**
 * Test Save Draft Endpoint
 * Comprehensive diagnostic for POST /drafts
 */

import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-idp';

const REGION = 'us-east-1';
const CLIENT_ID = '2md6sb5g5k31i4ejgr0tlvqq49';
const API_ENDPOINT = 'https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod';

async function testSaveDraft() {
  console.log('🧪 Testing POST /drafts Endpoint\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Step 1: Authenticate with Cognito
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
    const idToken = authResponse.AuthenticationResult?.IdToken;
    
    if (!accessToken) {
      throw new Error('No access token received');
    }
    
    console.log('✅ Authentication successful');
    console.log(`   Access Token: ${accessToken.substring(0, 50)}...`);
    console.log(`   ID Token: ${idToken?.substring(0, 50)}...\n`);

    // Step 2: Test OPTIONS /drafts (CORS preflight)
    console.log('📝 Step 2: Testing OPTIONS /drafts (CORS preflight)...');
    const optionsResponse = await fetch(`${API_ENDPOINT}/drafts`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://d2iqvvqxqxqxqx.cloudfront.net',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });

    console.log(`   Status: ${optionsResponse.status} ${optionsResponse.statusText}`);
    console.log(`   CORS Headers:`);
    console.log(`     Access-Control-Allow-Origin: ${optionsResponse.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`     Access-Control-Allow-Methods: ${optionsResponse.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`     Access-Control-Allow-Headers: ${optionsResponse.headers.get('Access-Control-Allow-Headers')}\n`);

    // Step 3: Test POST /drafts without token
    console.log('📝 Step 3: Testing POST /drafts WITHOUT token (should fail)...');
    const noAuthResponse = await fetch(`${API_ENDPOINT}/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Product',
        category: 'Apparel',
      }),
    });

    console.log(`   Status: ${noAuthResponse.status} ${noAuthResponse.statusText}`);
    if (!noAuthResponse.ok) {
      const errorText = await noAuthResponse.text();
      console.log(`   Response: ${errorText}\n`);
    }

    // Step 4: Test POST /drafts with token
    console.log('📝 Step 4: Testing POST /drafts WITH token (should succeed)...');
    const draftData = {
      name: 'Test Product Draft',
      description: 'This is a test draft',
      category: 'Apparel',
      lifecycleData: {
        materials: [
          {
            name: 'Organic Cotton',
            percentage: 100,
            origin: 'India',
            certifications: ['GOTS'],
          },
        ],
      },
    };

    console.log(`   Request Body: ${JSON.stringify(draftData, null, 2)}`);
    
    const draftResponse = await fetch(`${API_ENDPOINT}/drafts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(draftData),
    });

    console.log(`   Status: ${draftResponse.status} ${draftResponse.statusText}`);
    console.log(`   Response Headers:`);
    console.log(`     Content-Type: ${draftResponse.headers.get('Content-Type')}`);
    console.log(`     Access-Control-Allow-Origin: ${draftResponse.headers.get('Access-Control-Allow-Origin')}`);
    
    const responseText = await draftResponse.text();
    console.log(`   Response Body: ${responseText}\n`);

    if (draftResponse.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ Draft saved successfully!');
      console.log(`   Draft ID: ${result.draftId}`);
      console.log(`   Saved At: ${result.savedAt}\n`);
    } else {
      console.log('❌ Draft save failed\n');
      
      // Additional diagnostics
      console.log('🔍 Additional Diagnostics:');
      console.log(`   1. Check Lambda logs: aws logs tail /aws/lambda/gp-saveDraft-dev --follow`);
      console.log(`   2. Check API Gateway logs in CloudWatch`);
      console.log(`   3. Verify DynamoDB table exists: aws dynamodb describe-table --table-name Drafts`);
      console.log(`   4. Check Lambda IAM permissions\n`);
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🎉 Test Complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

testSaveDraft().catch(console.error);
