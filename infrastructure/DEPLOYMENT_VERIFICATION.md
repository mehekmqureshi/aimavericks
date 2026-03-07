# Deployment Verification Guide

This guide explains how to use the deployment verification script to validate that all AWS resources are properly deployed and accessible.

## Overview

The `verify-deployment.ts` script performs comprehensive checks on all deployed AWS resources:

- ✅ DynamoDB tables (Manufacturers, Products, ProductSerials, Drafts)
- ✅ S3 buckets (QR codes, Frontend assets)
- ✅ Cognito User Pool
- ✅ CloudFront Distribution
- ✅ Frontend accessibility
- ✅ API Gateway health check

## Prerequisites

1. AWS credentials configured (via `aws configure` or environment variables)
2. Required environment variables set (see below)
3. Node.js and TypeScript installed
4. AWS SDK dependencies installed

## Environment Variables

### Required
- `AWS_REGION` - AWS region where resources are deployed (default: `us-east-1`)
- `ENVIRONMENT` - Deployment environment (default: `dev`)

### Optional (for enhanced verification)
- `COGNITO_USER_POOL_ID` - Cognito User Pool ID to verify
- `CLOUDFRONT_DISTRIBUTION_ID` - CloudFront Distribution ID to verify
- `API_GATEWAY_URL` - API Gateway base URL to verify health check

## Usage

### Basic Verification

Run the script with default settings:

```bash
npx tsx infrastructure/verify-deployment.ts
```

### With Environment Variables

Verify a specific environment with all optional checks:

```bash
export AWS_REGION=us-east-1
export ENVIRONMENT=prod
export COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
export CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
export API_GATEWAY_URL=https://api.example.com

npx tsx infrastructure/verify-deployment.ts
```

### Windows (PowerShell)

```powershell
$env:AWS_REGION="us-east-1"
$env:ENVIRONMENT="prod"
$env:COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
$env:CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"
$env:API_GATEWAY_URL="https://api.example.com"

npx tsx infrastructure/verify-deployment.ts
```

## Output

The script provides detailed output for each verification check:

```
🚀 Starting Deployment Verification...
Region: us-east-1
Environment: dev

📊 Verifying DynamoDB Tables...
  ✓ Manufacturers: ACTIVE (5 items)
  ✓ Products: ACTIVE (10 items)
  ✓ ProductSerials: ACTIVE (50 items)
  ✓ Drafts: ACTIVE (2 items)

🪣 Verifying S3 Buckets...
  ✓ gp-qr-codes-dev: EXISTS (Encryption: AES256)
  ✓ gp-frontend-dev: EXISTS (Encryption: AES256)

🔐 Verifying Cognito User Pool...
  ✓ green-passport-user-pool-dev: ACTIVE

🌐 Verifying CloudFront Distribution...
  ✓ Distribution: DEPLOYED
  ✓ Domain: d1234567890abc.cloudfront.net

🌍 Verifying Frontend Accessibility...
  ✓ Frontend URL: https://d1234567890abc.cloudfront.net
  ✓ HTTP Status: 200
  ✓ React Root: Found

🔌 Verifying API Gateway...
  ✓ Health Check: https://api.example.com/health
  ✓ HTTP Status: 200

============================================================
DEPLOYMENT VERIFICATION SUMMARY
============================================================

Total Checks: 11
✓ Passed: 11
⚠ Warnings: 0
✗ Failed: 0

✅ ALL DEPLOYMENT CHECKS PASSED

============================================================
```

## Exit Codes

- `0` - All checks passed (or passed with warnings)
- `1` - One or more checks failed

## Verification Status

Each check returns one of three statuses:

- **PASS** ✓ - Resource exists and is properly configured
- **WARN** ⚠ - Resource exists but has configuration issues or optional check skipped
- **FAIL** ✗ - Resource not found or not accessible

## Troubleshooting

### DynamoDB Table Not Found

If a DynamoDB table is not found:

```bash
# Provision the missing table
npx tsx infrastructure/provision-dynamodb.ts
```

### S3 Bucket Not Found

If an S3 bucket is not found:

```bash
# Provision the missing buckets
npx tsx infrastructure/provision-s3.ts
```

### Cognito User Pool Not Found

If the Cognito User Pool verification fails:

1. Check that `COGNITO_USER_POOL_ID` is set correctly
2. Verify the user pool exists in the AWS Console
3. Ensure your AWS credentials have permission to describe user pools

### CloudFront Distribution Not Accessible

If CloudFront verification fails:

1. Check that `CLOUDFRONT_DISTRIBUTION_ID` is set correctly
2. Verify the distribution is deployed (not in progress)
3. Wait a few minutes for DNS propagation

### Frontend Not Accessible

If the frontend accessibility check fails:

1. Verify CloudFront distribution is deployed
2. Check that frontend assets are uploaded to S3
3. Verify CloudFront origin is configured correctly
4. Check CloudFront cache invalidation if recently deployed

### API Gateway Health Check Failed

If the API Gateway health check fails:

1. Verify `API_GATEWAY_URL` is set correctly
2. Check that the `/health` endpoint is deployed
3. Verify API Gateway stage is deployed
4. Check Lambda function permissions

## Integration with CI/CD

Add the verification script to your deployment pipeline:

```yaml
# Example GitHub Actions workflow
- name: Verify Deployment
  run: |
    export AWS_REGION=${{ secrets.AWS_REGION }}
    export ENVIRONMENT=prod
    export COGNITO_USER_POOL_ID=${{ secrets.COGNITO_USER_POOL_ID }}
    export CLOUDFRONT_DISTRIBUTION_ID=${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
    export API_GATEWAY_URL=${{ secrets.API_GATEWAY_URL }}
    npx tsx infrastructure/verify-deployment.ts
```

## Programmatic Usage

You can also import and use individual verification functions:

```typescript
import {
  verifyDynamoDBTables,
  verifyS3Buckets,
  verifyCloudFrontDistribution
} from './infrastructure/verify-deployment';

async function customVerification() {
  await verifyDynamoDBTables();
  await verifyS3Buckets();
  // Add custom logic
}
```

## Requirements Mapping

This verification script validates the following requirements:

- **Requirement 30.1**: Frontend accessibility via CloudFront
- **Requirement 30.2**: API Gateway health check
- **Requirement 30.3**: DynamoDB tables operational
- **Requirement 30.4**: S3 buckets configured
- **Requirement 30.5**: Cognito user pool active

## Next Steps

After successful verification:

1. Test user authentication flow
2. Create test products via the dashboard
3. Generate QR codes
4. Verify QR code scanning
5. Run end-to-end tests
