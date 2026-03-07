import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  ListUserPoolsCommand
} from '@aws-sdk/client-cognito-identity-provider';

const region = process.env.AWS_REGION || 'us-east-1';
const client = new CognitoIdentityProviderClient({ region });
const environment = process.env.ENVIRONMENT || 'dev';

async function findUserPoolId(): Promise<string | null> {
  const response = await client.send(new ListUserPoolsCommand({ MaxResults: 60 }));
  const poolName = `green-passport-user-pool-${environment}`;
  const pool = response.UserPools?.find(p => p.Name === poolName);
  return pool?.Id || null;
}

async function createTestUser(userPoolId: string, email: string, password: string, manufacturerId: string) {
  try {
    // Create user
    console.log(`Creating user: ${email}...`);
    await client.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' }
      ],
      MessageAction: 'SUPPRESS' // Don't send welcome email
    }));
    console.log('✓ User created');

    // Set permanent password
    console.log('Setting password...');
    await client.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true
    }));
    console.log('✓ Password set');

    console.log(`\n✅ Test user created successfully!`);
    console.log(`\nLogin credentials:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Manufacturer ID: ${manufacturerId}\n`);

  } catch (error: any) {
    if (error.name === 'UsernameExistsException') {
      console.log(`✓ User ${email} already exists`);
      console.log(`\nLogin credentials:`);
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  Manufacturer ID: ${manufacturerId}\n`);
    } else {
      throw error;
    }
  }
}

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          Creating Test Manufacturer User                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const userPoolId = await findUserPoolId();
    if (!userPoolId) {
      console.error('❌ User Pool not found. Run provision-cognito-simple.ts first.');
      process.exit(1);
    }

    console.log(`User Pool ID: ${userPoolId}\n`);

    // Create test manufacturer user
    await createTestUser(
      userPoolId,
      'manufacturer@greenpassport.com',
      'Test123!',
      'MFG001'
    );

    console.log('You can now login to the dashboard at:');
    console.log('  http://localhost:3001/login\n');

  } catch (error) {
    console.error('\n❌ Error creating test user:', error);
    process.exit(1);
  }
}

main();
