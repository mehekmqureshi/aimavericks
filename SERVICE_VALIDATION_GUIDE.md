# AWS Services Validation & Repair Guide

Comprehensive validation and automatic repair for all AWS services used in the GreenPrint application.

## Quick Start

### Windows
```bash
validate-services.bat
```

### Linux/Mac
```bash
chmod +x validate-services.sh
./validate-services.sh
```

### Manual
```bash
cd infrastructure
npx tsx validate-and-repair-services.ts
```

## What Gets Validated

### 1. Bedrock Connectivity
- Tests connection to Amazon Bedrock
- Invokes Titan text model with test prompt
- Validates IAM permissions for `bedrock:InvokeModel`
- **Auto-repair**: Verifies IAM role configuration

### 2. SageMaker Endpoint
- Checks endpoint status (must be `InService`)
- Tests model invocation with sample data
- Validates prediction response format
- **Auto-repair**: Provisions endpoint if missing

### 3. Lambda Concurrency
- Validates all Lambda functions exist
- Checks reserved concurrency settings
- Sets recommended concurrency (10) if not configured
- **Auto-repair**: Automatically sets concurrency limits

Functions validated:
- `createProduct`
- `getProduct`
- `listProducts`
- `updateProduct`
- `aiGenerate`
- `calculateEmission`
- `generateQR`
- `verifySerial`

### 4. DynamoDB Write/Read
- Tests write operations to all tables
- Validates read operations
- Performs cleanup of test data
- **Auto-repair**: Creates missing tables

Tables validated:
- `Products`
- `Manufacturers`
- `ProductSerials`

### 5. S3 Object Access
- Checks bucket existence
- Tests object upload (PUT)
- Tests object download (GET)
- Tests object deletion (DELETE)
- Performs cleanup of test objects
- **Auto-repair**: Creates missing buckets with proper permissions

Buckets validated:
- QR codes bucket
- Frontend hosting bucket

### 6. Cognito Login Flow
- Creates temporary test user
- Tests user authentication flow
- Validates token generation
- Performs cleanup of test user
- **Auto-repair**: Provisions user pool and client

## Validation Results

### Status Indicators
- ✓ **PASS**: Service is properly configured and working
- ✗ **FAIL**: Service has issues that need attention
- 🔧 **REPAIRED**: Service was automatically fixed

### Example Output
```
🔍 AWS Services Validation & Repair Tool
=========================================

Region: us-east-1
Timestamp: 2026-03-05T10:30:00.000Z

=== Validating Bedrock Connectivity ===
✓ Bedrock: Successfully connected and invoked model

=== Validating SageMaker Endpoint ===
✓ SageMaker: Endpoint active and responding

=== Validating Lambda Concurrency ===
🔧 Lambda:createProduct: Set reserved concurrency to 10
✓ Lambda:getProduct: Concurrency configured

=== Validating DynamoDB Write/Read ===
✓ DynamoDB:Products: Write and read successful
✓ DynamoDB:Manufacturers: Write and read successful

=== Validating S3 Object Access ===
✓ S3:gp-qr-codes-production: Write and read successful

=== Validating Cognito Login Flow ===
✓ Cognito: Login flow successful

=== Validation Summary ===
✓ Passed: 12
✗ Failed: 0
🔧 Repaired: 2
Total: 14

✅ All services validated successfully!
```

## Manual Repair

If automatic repair fails, use the repair tool:

```bash
cd infrastructure

# Repair specific services
npx tsx auto-repair-services.ts Lambda DynamoDB

# Repair all services
npx tsx auto-repair-services.ts all
```

### Available Repair Actions

| Service | Action | Description |
|---------|--------|-------------|
| Bedrock | verify-access | Verify IAM permissions |
| SageMaker | provision-endpoint | Create and deploy endpoint |
| Lambda | deploy-functions | Deploy all functions |
| DynamoDB | provision-tables | Create tables |
| S3 | provision-buckets | Create buckets |
| Cognito | provision-auth | Configure user pool |

## Troubleshooting

### Bedrock Fails
```
✗ Bedrock: Connection failed: AccessDeniedException
```
**Solution**: Check IAM role has `bedrock:InvokeModel` permission
```bash
cd infrastructure
npx tsx verify-bedrock-access.ts
```

### SageMaker Endpoint Not InService
```
✗ SageMaker: Endpoint not in service: Creating
```
**Solution**: Wait for endpoint deployment (5-10 minutes) or check CloudWatch logs

### Lambda Function Not Found
```
✗ Lambda:createProduct: Function not found
```
**Solution**: Deploy Lambda functions
```bash
cd infrastructure
npx tsx deploy-lambdas.ts
```

### DynamoDB Table Missing
```
✗ DynamoDB:Products: Operation failed: ResourceNotFoundException
```
**Solution**: Provision DynamoDB tables
```bash
cd infrastructure
npx tsx provision-dynamodb.ts
```

### S3 Bucket Missing
```
✗ S3:gp-qr-codes-production: Operation failed: NoSuchBucket
```
**Solution**: Create S3 buckets
```bash
cd infrastructure
npx tsx provision-s3.ts
```

### Cognito Configuration Missing
```
✗ Cognito: Missing Cognito configuration
```
**Solution**: Set environment variables and provision Cognito
```bash
# Update .env with Cognito IDs
cd infrastructure
npx tsx provision-cognito-simple.ts
```

## Environment Variables Required

Ensure your `.env` file contains:

```env
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id

SAGEMAKER_ENDPOINT_NAME=gp-carbon-predictor
PRODUCTS_TABLE_NAME=Products
MANUFACTURERS_TABLE_NAME=Manufacturers
PRODUCT_SERIALS_TABLE_NAME=ProductSerials
QR_CODES_BUCKET=gp-qr-codes-production
FRONTEND_BUCKET=gp-frontend-production
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id
```

## Scheduled Validation

### Set up automated validation (optional)

#### Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., daily at 9 AM)
4. Action: Start a program
5. Program: `C:\path\to\validate-services.bat`

#### Linux Cron
```bash
# Add to crontab (crontab -e)
0 9 * * * /path/to/validate-services.sh >> /var/log/aws-validation.log 2>&1
```

## Integration with CI/CD

Add to your deployment pipeline:

```yaml
# GitHub Actions example
- name: Validate AWS Services
  run: |
    cd infrastructure
    npx tsx validate-and-repair-services.ts
```

## Best Practices

1. **Run after deployment**: Always validate after deploying infrastructure changes
2. **Monitor regularly**: Schedule daily validation checks
3. **Review failures**: Don't ignore failed validations - they indicate real issues
4. **Check permissions**: Most failures are IAM permission issues
5. **Verify .env**: Ensure environment variables are up to date

## Support

If validation continues to fail after repair attempts:

1. Check AWS CloudWatch logs for detailed error messages
2. Verify IAM roles have necessary permissions
3. Ensure AWS account has sufficient quotas
4. Review AWS service health dashboard
5. Check network connectivity and security groups

## Related Scripts

- `infrastructure/verify-deployment.ts` - Full deployment verification
- `infrastructure/test-all-components.ts` - Component integration tests
- `infrastructure/monitoring.ts` - CloudWatch monitoring setup
- `infrastructure/provision-*.ts` - Individual service provisioning
