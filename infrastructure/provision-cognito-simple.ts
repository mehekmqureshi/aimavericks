import {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
  ListUserPoolsCommand,
  DescribeUserPoolCommand
} from '@aws-sdk/client-cognito-identity-provider';

const region = process.env.AWS_REGION || 'us-east-1';
const client = new CognitoIdentityProviderClient({ region });
const environment = process.env.ENVIRONMENT || 'dev';

async function findUserPool(poolName: string): Promise<string | null> {
  try {
    const response = await client.send(new ListUserPoolsCommand({ MaxResults: 60 }));
    const pool = response.UserPools?.find(p => p.Name === poolName);
    return pool?.Id || null;
  } catch (error) {
    console.error('Error listing user pools:', error);
    return null;
  }
}

async function main() {
  try {
    const poolName = `green-passport-user-pool-${environment}`;
    console.log(`\nProvisioning Cognito User Pool: ${poolName}`);
    console.log(`Region: ${region}\n`);

    // Check if pool already exists
    let userPoolId = await findUserPool(poolName);

    if (userPoolId) {
      console.log(`✓ User Pool already exists: ${userPoolId}`);
    } else {
      // Create User Pool
      console.log('Creating User Pool...');
      const createPoolResponse = await client.send(new CreateUserPoolCommand({
        PoolName: poolName,
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireUppercase: true,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: false // Changed to false for easier testing
          }
        },
        AutoVerifiedAttributes: ['email'],
        UsernameAttributes: ['email'],
        Schema: [
          {
            Name: 'email',
            AttributeDataType: 'String',
            Required: true,
            Mutable: false
          }
        ],
        MfaConfiguration: 'OFF', // Simplified for development
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Priority: 1,
              Name: 'verified_email'
            }
          ]
        }
      }));

      userPoolId = createPoolResponse.UserPool?.Id!;
      console.log(`✓ User Pool created: ${userPoolId}`);
    }

    // Create App Client
    console.log('\nCreating App Client...');
    const createClientResponse = await client.send(new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: `${poolName}-app-client`,
      GenerateSecret: false,
      RefreshTokenValidity: 30,
      AccessTokenValidity: 1,
      IdTokenValidity: 1,
      TokenValidityUnits: {
        RefreshToken: 'days',
        AccessToken: 'hours',
        IdToken: 'hours'
      },
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_USER_SRP_AUTH'
      ],
      PreventUserExistenceErrors: 'ENABLED'
    }));

    const appClientId = createClientResponse.UserPoolClient?.ClientId!;
    console.log(`✓ App Client created: ${appClientId}`);

    // Get User Pool details
    const poolDetails = await client.send(new DescribeUserPoolCommand({
      UserPoolId: userPoolId
    }));

    console.log('\n✅ Cognito User Pool provisioned successfully\n');
    console.log('Configuration:');
    console.log(`  User Pool ID: ${userPoolId}`);
    console.log(`  User Pool ARN: ${poolDetails.UserPool?.Arn}`);
    console.log(`  App Client ID: ${appClientId}`);
    console.log(`  Region: ${region}`);
    console.log('\nUpdate your frontend/.env file with:');
    console.log(`VITE_COGNITO_USER_POOL_ID=${userPoolId}`);
    console.log(`VITE_COGNITO_CLIENT_ID=${appClientId}`);
    console.log(`VITE_COGNITO_REGION=${region}`);

  } catch (error) {
    console.error('\n❌ Error provisioning Cognito:', error);
    process.exit(1);
  }
}

main();
