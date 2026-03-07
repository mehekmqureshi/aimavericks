# S3 Security Configuration - Quick Start

## Prerequisites

- AWS credentials configured
- S3 buckets already provisioned
- AWS Account ID

## Step 1: Set Environment Variables

```bash
export AWS_REGION=us-east-1
export ENVIRONMENT=dev
export AWS_ACCOUNT_ID=your-account-id-here
```

To find your AWS Account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

## Step 2: Configure Security

Run the security configuration script:

```bash
npx ts-node infrastructure/configure-s3-security.ts
```

This will:
- Configure bucket policy for signed URL access on QR codes bucket
- Verify public access is blocked
- Verify AES-256 encryption is enabled
- Verify versioning is enabled
- Provide security status report

## Step 3: Verify Security

Run the security test suite:

```bash
npx ts-node infrastructure/configure-s3-security.test.ts
```

This will test:
- ✓ Public access block configuration
- ✓ AES-256 encryption at rest
- ✓ Versioning on critical buckets
- ✓ Bucket policy for signed URL access
- ✓ HTTPS-only access enforcement

## Expected Output

### Configuration Script

```
Starting S3 security configuration for environment: dev

=== Configuring QR Codes Bucket Security ===
Configuring bucket policy for gp-qr-codes-dev...
  ✓ Bucket policy configured for signed URL access

Verifying security for gp-qr-codes-dev...
  ✓ Public access blocked
  ✓ AES-256 encryption enabled
  ✓ Versioning enabled
  ✓ Bucket policy configured

=== Verifying Frontend Bucket Security ===

Verifying security for gp-frontend-dev...
  ✓ AES-256 encryption enabled
  ✓ Bucket policy configured

✓ S3 security configuration completed successfully

Security Summary:
- QR codes bucket: Private access, encryption, versioning, signed URL policy
- Frontend bucket: CloudFront access, encryption, static website hosting
```

### Test Script

```
Testing S3 bucket security for environment: dev

=== Testing gp-qr-codes-dev ===
  ✓ Public Access Block: All public access is blocked
  ✓ AES-256 Encryption: AES-256 encryption is enabled
  ✓ Versioning: Versioning is enabled
  ✓ Bucket Policy: Bucket policy configured with HTTPS-only and signed URL access

=== Testing gp-frontend-dev ===
  ✓ AES-256 Encryption: AES-256 encryption is enabled
  ✓ Versioning: Versioning is not required for this bucket
  ✓ Bucket Policy: No bucket policy (not required)

=== Security Test Summary ===
Passed: 7/7

✓ All security tests passed
```

## Security Features Enabled

### QR Codes Bucket (`gp-qr-codes-dev`)

✓ **Block all public access**
- BlockPublicAcls: true
- IgnorePublicAcls: true
- BlockPublicPolicy: true
- RestrictPublicBuckets: true

✓ **AES-256 encryption at rest**
- Server-side encryption enabled
- Bucket key enabled for cost optimization

✓ **Versioning enabled**
- Protects against accidental deletion
- Allows recovery of previous versions

✓ **Bucket policy for signed URLs**
- HTTPS-only access enforced
- Access only through signed URLs
- 1-hour expiration on signed URLs

### Frontend Bucket (`gp-frontend-dev`)

✓ **AES-256 encryption at rest**
- Server-side encryption enabled

✓ **Static website hosting**
- Configured for SPA routing

✓ **CORS configuration**
- Allows API access from CloudFront

✓ **CloudFront access**
- Accessed via CloudFront distribution
- Origin Access Identity (OAI) configured

## Troubleshooting

### Error: AWS_ACCOUNT_ID environment variable is required

**Solution**: Set your AWS account ID:
```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

### Error: Access Denied

**Solution**: Ensure your AWS credentials have the following permissions:
- s3:PutBucketPolicy
- s3:GetBucketPolicy
- s3:GetPublicAccessBlock
- s3:GetBucketEncryption
- s3:GetBucketVersioning

### Error: Bucket does not exist

**Solution**: Provision buckets first:
```bash
npx ts-node infrastructure/provision-s3.ts
```

## Next Steps

After configuring S3 security:

1. ✓ Test signed URL generation from Lambda functions
2. ✓ Verify expired URLs return access denied
3. ✓ Configure CloudWatch monitoring
4. ✓ Set up S3 access logging (optional)
5. ✓ Document bucket names in deployment guide

## Security Compliance

These configurations satisfy:

- **Requirement 22.1**: Block all public access on QR codes bucket ✓
- **Requirement 22.3**: Enable encryption at rest (AES-256) ✓
- **Requirement 22.4**: Enable versioning on critical buckets ✓
- **Requirement 10.3**: Signed URLs with 1-hour expiration ✓
- **Requirement 10.5**: Access denied when signed URL expires ✓

## References

- [S3 Security Documentation](./S3_SECURITY.md)
- [S3 Provisioning Guide](./provision-s3.ts)
- [AWS S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
