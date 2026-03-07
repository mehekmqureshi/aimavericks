# Infrastructure Provisioning

This directory contains scripts for provisioning AWS infrastructure for the Green Passport platform.

## Prerequisites

1. **AWS Credentials**: Configure AWS credentials using one of these methods:
   - AWS CLI: Run `aws configure` and provide your access key, secret key, and region
   - Environment variables: Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`
   - IAM role: If running on EC2 or Lambda, use an IAM role with appropriate permissions

2. **IAM Permissions**: Ensure your AWS credentials have the following permissions:
   - DynamoDB: `dynamodb:CreateTable`, `dynamodb:DescribeTable`, `dynamodb:ListTables`
   - S3: `s3:CreateBucket`, `s3:PutBucketEncryption`, `s3:PutBucketVersioning`, `s3:PutPublicAccessBlock`, `s3:PutBucketCors`, `s3:PutBucketWebsite`, `s3:HeadBucket`
   - Cognito: `cognito-idp:CreateUserPool`, `cognito-idp:DescribeUserPool`, `cognito-idp:CreateUserPoolClient`, `cognito-idp:DescribeUserPoolClient`

### AWS Credentials Setup

If you haven't configured AWS credentials yet:

```bash
# Install AWS CLI (if not already installed)
# Windows: Download from https://aws.amazon.com/cli/
# macOS: brew install awscli
# Linux: sudo apt-get install awscli

# Configure credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter your default output format (e.g., json)
```

## DynamoDB Tables

### Provisioning Tables

To provision all DynamoDB tables, run:

```bash
npm run provision:dynamodb
```

This will create the following tables:

#### 1. Manufacturers Table
- **Primary Key**: `manufacturerId` (String)
- **Billing Mode**: On-demand (PAY_PER_REQUEST)
- **Encryption**: AES-256 at rest
- **Purpose**: Store manufacturer profile information

#### 2. Products Table
- **Primary Key**: `productId` (String)
- **Global Secondary Index**: `manufacturerId-index` on `manufacturerId`
- **Billing Mode**: On-demand (PAY_PER_REQUEST)
- **Encryption**: AES-256 at rest
- **Purpose**: Store product information with lifecycle data and carbon metrics

#### 3. ProductSerials Table
- **Primary Key**: `serialId` (String)
- **Global Secondary Index**: `productId-index` on `productId`
- **Billing Mode**: On-demand (PAY_PER_REQUEST)
- **Encryption**: AES-256 at rest
- **Purpose**: Store QR code serial numbers with digital signatures

### Environment Variables

- `AWS_REGION`: AWS region for table creation (default: `us-east-1`)

### Notes

- The script checks if tables already exist before attempting to create them
- Tables use on-demand billing mode for cost optimization
- All tables have encryption at rest enabled by default
- The script waits for tables to become active before completing

### Testing

To run the provisioning tests (requires AWS credentials):

```bash
npm test -- infrastructure/provision-dynamodb.test.ts
```

The tests will:
- Verify table creation with correct primary keys
- Verify Global Secondary Indexes are configured correctly
- Verify billing mode is set to on-demand
- Verify encryption at rest is enabled
- Test idempotency (running provisioning multiple times)

**Note**: Tests are automatically skipped if AWS credentials are not configured.

## S3 Buckets

### Provisioning Buckets

To provision all S3 buckets, run:

```bash
npm run provision:s3
```

This will create the following buckets:

#### 1. QR Codes Bucket
- **Bucket Name**: `gp-qr-codes-{environment}` (e.g., `gp-qr-codes-dev`)
- **Public Access**: Blocked (all public access disabled)
- **Encryption**: AES-256 at rest
- **Versioning**: Enabled
- **Purpose**: Store QR code images with private access, accessible via signed URLs

#### 2. Frontend Assets Bucket
- **Bucket Name**: `gp-frontend-{environment}` (e.g., `gp-frontend-dev`)
- **Public Access**: Configured for CloudFront access
- **Encryption**: AES-256 at rest
- **Versioning**: Disabled
- **Static Website Hosting**: Enabled (index.html as index and error document)
- **CORS**: Enabled for API access
- **Purpose**: Store and serve frontend React application assets

### Environment Variables

- `AWS_REGION`: AWS region for bucket creation (default: `us-east-1`)
- `ENVIRONMENT`: Environment suffix for bucket names (default: `dev`)

### Notes

- The script checks if buckets already exist before attempting to create them
- All buckets have encryption at rest enabled by default
- QR codes bucket has versioning enabled for data protection
- Frontend bucket is configured for static website hosting
- Bucket names must be globally unique across all AWS accounts

### Testing

To run the S3 provisioning tests (requires AWS credentials):

```bash
npm test -- infrastructure/provision-s3.test.ts
```

The tests will:
- Verify bucket creation with correct configurations
- Verify encryption at rest is enabled
- Verify versioning is enabled (QR codes bucket)
- Verify public access blocks are configured (QR codes bucket)
- Verify static website hosting is configured (frontend bucket)
- Verify CORS is configured (frontend bucket)
- Test idempotency (running provisioning multiple times)

**Note**: Tests are automatically skipped if AWS credentials are not configured.

## Cognito User Pool

### Provisioning User Pool

To provision the Cognito User Pool, run:

```bash
npm run provision:cognito
```

This will create the following resources:

#### Green Passport User Pool
- **Pool Name**: `green-passport-user-pool-{environment}` (e.g., `green-passport-user-pool-dev`)
- **Authentication**: Email/password
- **JWT Token Expiration**: 
  - Access Token: 1 hour
  - ID Token: 1 hour
  - Refresh Token: 30 days
- **Custom Attributes**: `manufacturer_role` (String, mutable)
- **Password Policy**: 
  - Minimum length: 8 characters
  - Requires uppercase, lowercase, numbers, and symbols
- **Auto-verified Attributes**: Email
- **Username Attributes**: Email
- **MFA**: Optional
- **Account Recovery**: Via verified email

#### App Client
- **Client Name**: `green-passport-user-pool-app-client-{environment}`
- **Type**: Public client (no secret)
- **Auth Flows**: USER_PASSWORD_AUTH, REFRESH_TOKEN_AUTH, USER_SRP_AUTH
- **Read/Write Attributes**: email, custom:manufacturer_role
- **Purpose**: Frontend application authentication

### Environment Variables

- `AWS_REGION`: AWS region for User Pool creation (default: `us-east-1`)
- `ENVIRONMENT`: Environment suffix for User Pool name (default: `dev`)

### MCP Server Integration

The Cognito provisioning script is designed to work with the `@modelcontextprotocol/server-aws-cognito` MCP server. To enable MCP integration:

1. Add the following to `.kiro/settings/mcp.json`:
   ```json
   {
     "mcpServers": {
       "aws-cognito": {
         "command": "uvx",
         "args": ["@modelcontextprotocol/server-aws-cognito@latest"],
         "env": {},
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

2. Restart Kiro or reconnect the MCP server from the MCP Server view

### Notes

- The script provides the complete configuration structure for the User Pool
- JWT tokens expire after 1 hour as per security requirements
- Custom `manufacturer_role` attribute allows role-based access control
- Password policy enforces strong passwords for security
- Email verification is required for account activation

### Testing

To run the Cognito provisioning tests:

```bash
npm test -- infrastructure/provision-cognito.test.ts
```

The tests will:
- Verify User Pool configuration structure
- Verify JWT token expiration settings (1 hour)
- Verify custom manufacturer_role attribute
- Verify email/password authentication configuration
- Verify app client configuration for frontend
- Verify security settings (password policy, email verification)

## Provisioning All Infrastructure

To provision all infrastructure at once:

```bash
# Set environment (optional, defaults to 'dev')
export ENVIRONMENT=dev

# Provision DynamoDB tables
npm run provision:dynamodb

# Provision S3 buckets
npm run provision:s3

# Provision Cognito User Pool
npm run provision:cognito
```

## Troubleshooting

### Bucket Name Already Exists

If you get an error that a bucket name already exists, it means:
1. The bucket was created in a previous run (this is fine, the script will skip it)
2. Another AWS account owns a bucket with that name (change the `ENVIRONMENT` variable)

### Permission Denied

If you get permission errors:
1. Verify your AWS credentials are configured correctly
2. Ensure your IAM user/role has the required permissions listed in Prerequisites
3. Check that you're using the correct AWS region

### Region-Specific Issues

- S3 bucket creation in `us-east-1` doesn't require a LocationConstraint
- For other regions, the script automatically sets the LocationConstraint
- Ensure your AWS credentials have access to the specified region
