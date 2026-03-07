# AWS Services Validation System - Setup Complete

## What Was Created

### 1. Validation Script
**File**: `infrastructure/validate-and-repair-services.ts`

Comprehensive validation tool that checks:
- ✓ Bedrock connectivity and model invocation
- ✓ SageMaker endpoint status and predictions
- ✓ Lambda function concurrency settings (auto-repairs)
- ✓ DynamoDB read/write operations
- ✓ S3 object access (PUT/GET/DELETE)
- ✓ Cognito authentication flow

### 2. Auto-Repair Script
**File**: `infrastructure/auto-repair-services.ts`

Automated repair tool for failed services:
- Provisions missing resources
- Fixes configuration issues
- Deploys required infrastructure

### 3. Quick-Run Scripts
**Files**: 
- `validate-services.bat` (Windows)
- `validate-services.sh` (Linux/Mac)

One-click validation from project root.

### 4. Documentation
**File**: `SERVICE_VALIDATION_GUIDE.md`

Complete guide covering:
- Quick start instructions
- Detailed service checks
- Troubleshooting steps
- CI/CD integration
- Best practices

### 5. NPM Scripts
Added to `package.json`:
```json
"validate:services": "npx tsx infrastructure/validate-and-repair-services.ts"
"repair:services": "npx tsx infrastructure/auto-repair-services.ts"
```

## How to Use

### Quick Validation
```bash
# Windows
validate-services.bat

# Linux/Mac
./validate-services.sh

# Or via npm
npm run validate:services
```

### Manual Repair
```bash
# Repair specific services
npm run repair:services Lambda DynamoDB

# Repair all
npm run repair:services all
```

## What Gets Validated

| Service | Check | Auto-Repair |
|---------|-------|-------------|
| Bedrock | Model invocation | ✓ Verifies IAM |
| SageMaker | Endpoint status & prediction | ✓ Provisions endpoint |
| Lambda | Function existence & concurrency | ✓ Sets concurrency |
| DynamoDB | Write/read operations | ✓ Creates tables |
| S3 | Object operations | ✓ Creates buckets |
| Cognito | Authentication flow | ✓ Provisions pool |

## Validation Output

```
🔍 AWS Services Validation & Repair Tool
=========================================

✓ Bedrock: Successfully connected and invoked model
✓ SageMaker: Endpoint active and responding
🔧 Lambda:createProduct: Set reserved concurrency to 10
✓ DynamoDB:Products: Write and read successful
✓ S3:gp-qr-codes-production: Write and read successful
✓ Cognito: Login flow successful

=== Validation Summary ===
✓ Passed: 12
✗ Failed: 0
🔧 Repaired: 2
Total: 14

✅ All services validated successfully!
```

## Integration Points

### After Deployment
```bash
npm run deploy:complete
npm run validate:services
```

### CI/CD Pipeline
```yaml
- name: Validate Services
  run: npm run validate:services
```

### Scheduled Monitoring
Set up daily validation via Task Scheduler (Windows) or cron (Linux).

## Troubleshooting

If validation fails:

1. **Check .env file** - Ensure all AWS credentials are set
2. **Review IAM permissions** - Most failures are permission issues
3. **Run auto-repair** - `npm run repair:services all`
4. **Check CloudWatch logs** - Detailed error messages
5. **Verify AWS quotas** - Ensure account limits not exceeded

## Common Fixes

### Bedrock Access Denied
```bash
cd infrastructure
npx tsx verify-bedrock-access.ts
```

### Lambda Not Found
```bash
cd infrastructure
npx tsx deploy-lambdas.ts
```

### DynamoDB Table Missing
```bash
npm run provision:dynamodb
```

### S3 Bucket Missing
```bash
npm run provision:s3
```

### Cognito Not Configured
```bash
cd infrastructure
npx tsx provision-cognito-simple.ts
```

## Next Steps

1. Run initial validation: `npm run validate:services`
2. Fix any failures using auto-repair
3. Integrate into deployment workflow
4. Set up scheduled monitoring (optional)
5. Review SERVICE_VALIDATION_GUIDE.md for details

## Benefits

- **Automated Testing**: Validates all AWS services in one command
- **Auto-Repair**: Fixes common issues automatically
- **Early Detection**: Catches configuration problems before users do
- **CI/CD Ready**: Easy integration into deployment pipelines
- **Comprehensive**: Tests actual operations, not just existence
- **Clean**: Automatically cleans up test data

## Support

For detailed troubleshooting, see `SERVICE_VALIDATION_GUIDE.md`.

---

**Status**: ✅ Ready to use
**Last Updated**: March 5, 2026
