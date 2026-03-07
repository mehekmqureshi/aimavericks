# CloudFront Distribution Setup

## Overview

This document describes the CloudFront distribution provisioning for the Green Passport platform frontend. CloudFront serves as the global CDN (Content Delivery Network) that delivers the React application to users worldwide with low latency and high performance.

## Architecture

```
User Browser
    ↓
CloudFront Distribution (HTTPS)
    ↓
Origin Access Identity (OAI)
    ↓
S3 Bucket (Private)
    ↓
Frontend Assets (React App)
```

## Components

### 1. CloudFront Distribution
- **Purpose**: Global CDN for frontend delivery
- **Protocol**: HTTPS (redirect from HTTP)
- **Compression**: Enabled (gzip/brotli)
- **HTTP Version**: HTTP/2 and HTTP/3 support
- **Price Class**: PriceClass_100 (North America and Europe)

### 2. Origin Access Identity (OAI)
- **Purpose**: Secure access from CloudFront to S3
- **Security**: S3 bucket remains private, only accessible via CloudFront
- **Configuration**: Automatically created and linked to distribution

### 3. S3 Origin
- **Bucket**: `gp-frontend-{environment}`
- **Access**: Private (via OAI only)
- **Encryption**: AES-256 at rest

## Cache Behaviors

### Default Behavior
- **Path**: `/*` (all files)
- **TTL**: 
  - Min: 0 seconds
  - Default: 1 day (86400 seconds)
  - Max: 1 year (31536000 seconds)
- **Compression**: Enabled
- **HTTPS**: Redirect to HTTPS

### Static Assets (`assets/*`)
- **Path**: `assets/*` (JS, CSS, images)
- **TTL**: 1 year (immutable assets with content hashing)
- **Compression**: Enabled
- **Cache**: Aggressive caching for performance

### HTML Files (`*.html`)
- **Path**: `*.html`
- **TTL**: 0 (no cache, always fetch fresh)
- **Compression**: Enabled
- **Purpose**: Ensure users always get latest version

## Custom Error Responses (SPA Routing)

CloudFront is configured to support Single Page Application (SPA) routing:

### 404 Not Found
- **Response**: Return `/index.html` with 200 status
- **Purpose**: Allow React Router to handle client-side routing
- **Cache**: 5 minutes (300 seconds)

### 403 Forbidden
- **Response**: Return `/index.html` with 200 status
- **Purpose**: Handle S3 access denied as SPA route
- **Cache**: 5 minutes (300 seconds)

## Security Configuration

### HTTPS/TLS
- **Protocol**: TLS 1.2 or higher
- **Certificate**: Default CloudFront certificate (*.cloudfront.net)
- **Upgrade Path**: Can be upgraded to custom domain with ACM certificate

### Origin Access
- **Method**: Origin Access Identity (OAI)
- **S3 Bucket Policy**: Allows only CloudFront OAI to access objects
- **Public Access**: Blocked on S3 bucket

### Allowed Methods
- **GET**: Retrieve content
- **HEAD**: Check content existence
- **Cached Methods**: GET, HEAD only

## Provisioning

### Prerequisites

1. **AWS Credentials**: Configure AWS CLI
   ```bash
   aws configure
   ```

2. **S3 Bucket**: Frontend bucket must exist
   ```bash
   npm run provision:s3
   ```

3. **Frontend Build**: Build and deploy frontend assets
   ```bash
   cd frontend
   npm run build
   cd ..
   FRONTEND_BUCKET=gp-frontend-{environment} npx tsx infrastructure/deploy-frontend.ts
   ```

### Run Provisioning

```bash
# Set environment (optional, defaults to 'dev')
export ENVIRONMENT=dev

# Set frontend bucket name (optional, defaults to gp-frontend-{environment})
export FRONTEND_BUCKET=gp-frontend-dev

# Provision CloudFront distribution
npm run provision:cloudfront
```

### Expected Output

```
Starting CloudFront provisioning for environment: dev

Frontend bucket: gp-frontend-dev

Creating Origin Access Identity...
  ✓ Origin Access Identity created: E1234567890ABC

Updating S3 bucket policy for gp-frontend-dev...
  ✓ S3 bucket policy updated

Creating CloudFront distribution...
  ✓ CloudFront distribution created: E9876543210XYZ
  ✓ Distribution domain: d1234567890abc.cloudfront.net
  ✓ Status: InProgress

✓ CloudFront provisioning completed successfully

Distribution Details:
  Distribution ID: E9876543210XYZ
  Distribution Domain: d1234567890abc.cloudfront.net
  OAI ID: E1234567890ABC

Frontend URL: https://d1234567890abc.cloudfront.net

Note: Distribution deployment may take 15-20 minutes to complete.
Check status in AWS Console: CloudFront > Distributions
```

## Verification

### 1. Check Distribution Status

```bash
aws cloudfront get-distribution --id E9876543210XYZ
```

Look for `"Status": "Deployed"` in the output.

### 2. Test Frontend Access

```bash
# Test HTTPS access
curl -I https://d1234567890abc.cloudfront.net

# Should return 200 OK with CloudFront headers
```

### 3. Test SPA Routing

```bash
# Test non-existent route (should return index.html)
curl https://d1234567890abc.cloudfront.net/some/random/path

# Should return index.html content with 200 status
```

### 4. Run Test Suite

```bash
# Set distribution ID
export DISTRIBUTION_ID=E9876543210XYZ

# Run tests
npm test -- infrastructure/provision-cloudfront.test.ts
```

## Cache Invalidation

After deploying new frontend assets, invalidate the CloudFront cache:

```bash
# Invalidate all files
aws cloudfront create-invalidation \
  --distribution-id E9876543210XYZ \
  --paths "/*"

# Invalidate specific files
aws cloudfront create-invalidation \
  --distribution-id E9876543210XYZ \
  --paths "/index.html" "/assets/*"
```

## Custom Domain Setup (Optional)

To use a custom domain (e.g., `app.greenpassport.com`):

### 1. Request SSL Certificate in ACM

```bash
aws acm request-certificate \
  --domain-name app.greenpassport.com \
  --validation-method DNS \
  --region us-east-1
```

**Note**: Certificate must be in `us-east-1` region for CloudFront.

### 2. Validate Certificate

Add the DNS validation records provided by ACM to your domain's DNS.

### 3. Update Distribution

```bash
aws cloudfront update-distribution \
  --id E9876543210XYZ \
  --distribution-config file://distribution-config.json
```

Update the distribution config to include:
```json
{
  "Aliases": {
    "Quantity": 1,
    "Items": ["app.greenpassport.com"]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/...",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
```

### 4. Update DNS

Add a CNAME or ALIAS record pointing to the CloudFront domain:

```
app.greenpassport.com  CNAME  d1234567890abc.cloudfront.net
```

## Monitoring

### CloudWatch Metrics

CloudFront automatically publishes metrics to CloudWatch:

- **Requests**: Total number of requests
- **BytesDownloaded**: Total bytes served
- **ErrorRate**: 4xx and 5xx error rates
- **CacheHitRate**: Percentage of requests served from cache

### Access Logs (Optional)

Enable CloudFront access logs for detailed request analysis:

```bash
aws cloudfront update-distribution \
  --id E9876543210XYZ \
  --distribution-config file://distribution-config-with-logging.json
```

Logs will be stored in an S3 bucket for analysis.

## Cost Optimization

### Price Class

The distribution uses `PriceClass_100` (North America and Europe only) to reduce costs. To expand globally:

```bash
# Update to PriceClass_All for worldwide edge locations
aws cloudfront update-distribution \
  --id E9876543210XYZ \
  --distribution-config file://distribution-config-global.json
```

### Cache Hit Rate

Monitor cache hit rate and optimize:
- Increase TTL for static assets
- Use versioned file names (Vite does this automatically)
- Minimize cache invalidations

## Troubleshooting

### Issue: Distribution Stuck in "InProgress"

**Solution**: Wait 15-20 minutes for initial deployment. Check status:
```bash
aws cloudfront get-distribution --id E9876543210XYZ --query 'Distribution.Status'
```

### Issue: 403 Forbidden Errors

**Possible Causes**:
1. S3 bucket policy not updated
2. OAI not configured correctly
3. Files not uploaded to S3

**Solution**:
```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket gp-frontend-dev

# Verify files exist
aws s3 ls s3://gp-frontend-dev/ --recursive

# Re-run provisioning
npm run provision:cloudfront
```

### Issue: Stale Content After Deployment

**Solution**: Create cache invalidation
```bash
aws cloudfront create-invalidation \
  --distribution-id E9876543210XYZ \
  --paths "/*"
```

### Issue: SPA Routes Return 404

**Solution**: Verify custom error responses are configured
```bash
aws cloudfront get-distribution --id E9876543210XYZ \
  --query 'Distribution.DistributionConfig.CustomErrorResponses'
```

Should show 404 and 403 redirecting to `/index.html`.

## Requirements Satisfied

✅ **Requirement 19.1**: Frontend hosted on CloudFront distribution
✅ **Requirement 19.3**: HTTPS enabled for all connections
✅ **Requirement 19.4**: Static assets cached with appropriate TTL values
✅ **Requirement 27.1**: Infrastructure provisioning via AWS SDK

## Next Steps

1. **Custom Domain**: Set up custom domain with ACM certificate
2. **WAF**: Add AWS WAF for additional security
3. **Lambda@Edge**: Add edge functions for advanced routing or authentication
4. **Monitoring**: Set up CloudWatch alarms for error rates and performance
5. **CI/CD**: Integrate CloudFront invalidation into deployment pipeline

## References

- [CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)
- [Origin Access Identity](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [Custom Error Pages](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages.html)
- [Cache Behaviors](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesCacheBehavior)
