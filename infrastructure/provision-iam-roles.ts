/**
 * IAM Roles Provisioning Script
 * 
 * Creates IAM roles for all Lambda functions with least privilege permissions
 * 
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
 */

import {
  IAMClient,
  CreateRoleCommand,
  PutRolePolicyCommand,
  GetRoleCommand
} from '@aws-sdk/client-iam';

const client = new IAMClient({ region: process.env.AWS_REGION || 'us-east-1' });
const environment = process.env.ENVIRONMENT || 'dev';
const accountId = process.env.AWS_ACCOUNT_ID;

interface RoleConfig {
  name: string;
  description: string;
  policies: {
    dynamodb?: string[];
    s3?: string[];
    bedrock?: boolean;
    logs: boolean;
  };
}

const assumeRolePolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: 'lambda.amazonaws.com'
      },
      Action: 'sts:AssumeRole'
    }
  ]
};

async function roleExists(roleName: string): Promise<boolean> {
  try {
    await client.send(new GetRoleCommand({ RoleName: roleName }));
    return true;
  } catch (error: any) {
    if (error.name === 'NoSuchEntity' || error.Code === 'NoSuchEntity') {
      return false;
    }
    throw error;
  }
}

function generatePolicy(config: RoleConfig): any {
  const statements: any[] = [];

  // CloudWatch Logs permissions (required for all Lambda functions)
  if (config.policies.logs) {
    statements.push({
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: `arn:aws:logs:*:${accountId}:*`
    });
  }

  // DynamoDB permissions
  if (config.policies.dynamodb && config.policies.dynamodb.length > 0) {
    const actions: string[] = [];
    config.policies.dynamodb.forEach(action => {
      if (action === 'read') {
        actions.push('dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan');
      } else if (action === 'write') {
        actions.push('dynamodb:PutItem', 'dynamodb:UpdateItem');
      } else if (action === 'delete') {
        actions.push('dynamodb:DeleteItem');
      }
    });

    statements.push({
      Effect: 'Allow',
      Action: actions,
      Resource: [
        `arn:aws:dynamodb:*:${accountId}:table/Products`,
        `arn:aws:dynamodb:*:${accountId}:table/Manufacturers`,
        `arn:aws:dynamodb:*:${accountId}:table/ProductSerials`,
        `arn:aws:dynamodb:*:${accountId}:table/Drafts`,
        `arn:aws:dynamodb:*:${accountId}:table/Products/index/*`,
        `arn:aws:dynamodb:*:${accountId}:table/ProductSerials/index/*`,
        `arn:aws:dynamodb:*:${accountId}:table/Drafts/index/*`
      ]
    });
  }

  // S3 permissions
  if (config.policies.s3 && config.policies.s3.length > 0) {
    const actions: string[] = [];
    config.policies.s3.forEach(action => {
      if (action === 'read') {
        actions.push('s3:GetObject');
      } else if (action === 'write') {
        actions.push('s3:PutObject');
      }
    });

    statements.push({
      Effect: 'Allow',
      Action: actions,
      Resource: [
        `arn:aws:s3:::gp-qr-codes-${environment}/*`,
        `arn:aws:s3:::gp-frontend-*/*`
      ]
    });
  }

  // Bedrock permissions
  if (config.policies.bedrock) {
    statements.push({
      Effect: 'Allow',
      Action: ['bedrock:InvokeModel'],
      Resource: `arn:aws:bedrock:*::foundation-model/*`
    });
  }

  return {
    Version: '2012-10-17',
    Statement: statements
  };
}

async function createRole(config: RoleConfig): Promise<string> {
  const roleName = `gp-${config.name}-role-${environment}`;

  if (await roleExists(roleName)) {
    console.log(`  ✓ Role ${roleName} already exists`);
    return `arn:aws:iam::${accountId}:role/${roleName}`;
  }

  console.log(`  Creating role ${roleName}...`);

  // Create role
  const createRoleResponse = await client.send(new CreateRoleCommand({
    RoleName: roleName,
    AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
    Description: config.description
  }));

  // Attach inline policy
  const policy = generatePolicy(config);
  await client.send(new PutRolePolicyCommand({
    RoleName: roleName,
    PolicyName: `${roleName}-policy`,
    PolicyDocument: JSON.stringify(policy)
  }));

  console.log(`  ✓ Role ${roleName} created`);
  return createRoleResponse.Role!.Arn!;
}

async function main() {
  console.log('Provisioning IAM roles for Lambda functions...\n');

  if (!accountId) {
    console.error('Error: AWS_ACCOUNT_ID environment variable not set');
    console.log('Run: export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)');
    process.exit(1);
  }

  const roles: RoleConfig[] = [
    {
      name: 'createProduct',
      description: 'Role for createProduct Lambda function',
      policies: {
        dynamodb: ['write'],
        logs: true
      }
    },
    {
      name: 'generateQR',
      description: 'Role for generateQR Lambda function',
      policies: {
        dynamodb: ['read', 'write'],
        s3: ['write'],
        logs: true
      }
    },
    {
      name: 'getProduct',
      description: 'Role for getProduct Lambda function',
      policies: {
        dynamodb: ['read'],
        logs: true
      }
    },
    {
      name: 'verifySerial',
      description: 'Role for verifySerial Lambda function',
      policies: {
        dynamodb: ['read', 'write'],
        logs: true
      }
    },
    {
      name: 'aiGenerate',
      description: 'Role for aiGenerate Lambda function',
      policies: {
        dynamodb: ['read'],
        bedrock: true,
        logs: true
      }
    },
    {
      name: 'updateProduct',
      description: 'Role for updateProduct Lambda function',
      policies: {
        dynamodb: ['read', 'write'],
        logs: true
      }
    },
    {
      name: 'listProducts',
      description: 'Role for listProducts Lambda function',
      policies: {
        dynamodb: ['read'],
        logs: true
      }
    },
    {
      name: 'calculateEmission',
      description: 'Role for calculateEmission Lambda function',
      policies: {
        logs: true
      }
    },
    {
      name: 'saveDraft',
      description: 'Role for saveDraft Lambda function',
      policies: {
        dynamodb: ['write'],
        logs: true
      }
    },
    {
      name: 'getDraft',
      description: 'Role for getDraft Lambda function',
      policies: {
        dynamodb: ['read'],
        logs: true
      }
    },
    {
      name: 'getManufacturer',
      description: 'Role for getManufacturer Lambda function',
      policies: {
        dynamodb: ['read'],
        logs: true
      }
    },
    {
      name: 'updateManufacturer',
      description: 'Role for updateManufacturer Lambda function',
      policies: {
        dynamodb: ['read', 'write'],
        logs: true
      }
    }
  ];

  const roleArns: Record<string, string> = {};

  for (const roleConfig of roles) {
    try {
      const arn = await createRole(roleConfig);
      roleArns[roleConfig.name] = arn;
    } catch (error: any) {
      console.error(`  ✗ Failed to create role ${roleConfig.name}:`, error.message);
      throw error;
    }
  }

  console.log('\n✓ All IAM roles provisioned successfully\n');
  console.log('Role ARNs:');
  Object.entries(roleArns).forEach(([name, arn]) => {
    console.log(`  ${name}: ${arn}`);
  });

  console.log('\nExport these as environment variables for deployment:');
  Object.entries(roleArns).forEach(([name, arn]) => {
    console.log(`export ${name.toUpperCase()}_ROLE_ARN="${arn}"`);
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { createRole };
