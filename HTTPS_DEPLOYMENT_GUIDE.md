# HTTPS Deployment Guide

Complete guide for deploying Green Passport with HTTPS-only access.

## Architecture

```
Frontend: S3 (Private Bucket) → CloudFront → HTTPS (ACM Certificate)
Backend:  API Gateway → HTTPS Only
```

## Security Features

✅ **S3 Bucket**: Private (no public access)  
✅ **CloudFront**: HTTPS only (redirect HTTP → HTTPS)  
✅ **API Gateway**: HTTPS endpoints only  
✅ **No HTTP Endpoints**: All S3 website endpoints disabled  
✅ **Origin Access Identity**: CloudFront-only S3 access  

## Quick Start

### Option 1: Automated Deployment (Recommended)

**Windows:**
```bash
deploy-https-complete.bat
```

**Linux/Mac:**
```bash
chmod +x deploy-https-complete.sh
./deploy-https-complete.sh
```

### Option 2: Manual Deployment

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

2. **Deploy to AWS**
   ```bash
   ts-node infrastructure/deploy-cloudfront-https.ts
   ```

3. **Run Tests**
   ```bash
   ts-node infrastructure/test-all-components.ts
   ```

## What Gets Deployed

### Frontend Deployment
- ✅ Build frontend assets
- ✅ Upload to private S3 bucket
- ✅ Create CloudFront distribution
- ✅ Configure Origin Access Identity (OAI)
- ✅ Set HTTPS-only policy
- ✅ Invalidate CloudFront cache

### Backend Configuration
- ✅ Verify API Gateway HTTPS endpoints
- ✅ Update CORS headers
- ✅ Configure Lambda environment variables

## Automated Tests

The deployment automatically tests:

1. **Frontend HTTPS Access** - Verifies CloudFront serves via HTTPS
2. **API Gateway HTTPS** - Confirms all API calls use HTTPS
3. **Create Product** - Tests product creation endpoint
4. **Save Draft** - Tests draft saving functionality
5. **Generate QR** - Tests QR code generation
6. **AI Autofill** - Tests AI-powered autofill
7. **QR Scan** - Tests QR code verification
8. **Sustainability Badge** - Tests badge calculation
9. **DynamoDB Records** - Tests database operations

## Environment Variables

Ensure these are set in `frontend/.env`:

```env
VITE_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=your-user-pool-id
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_COGNITO_REGION=us-east-1
VITE_ENVIRONMENT=production
```

## Deployment Timeline

| Step | Duration | Status Check |
|------|----------|--------------|
| Build Frontend | 1-2 min | Check `frontend/dist/` |
| Upload to S3 | 1-2 min | AWS Console → S3 |
| Create CloudFront | 15-20 min | AWS Console → CloudFront |
| Cache Invalidation | 5-10 min | CloudFront Invalidations |
| Run Tests | 2-3 min | Terminal output |

## Verification

### 1. Check CloudFront Distribution
```bash
aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='Green Passport Frontend - prod (HTTPS Only)']"
```

### 2. Test HTTPS Access
```bash
curl -I https://your-distribution.cloudfront.net
```

### 3. Verify S3 is Private
```bash
curl -I http://gp-frontend-prod.s3-website-us-east-1.amazonaws.com
# Should return 403 Forbidden or connection refused
```

### 4. Test API Endpoints
```bash
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/products
```

## Troubleshooting

### Issue: CloudFront returns 403 Forbidden

**Solution:**
1. Check Origin Access Identity is configured
2. Verify S3 bucket policy allows CloudFront OAI
3. Ensure files are uploaded to S3

```bash
ts-node infrastructure/deploy-cloudfront-https.ts
```

### Issue: Tests fail with "Authentication required"

**Solution:**
This is expected for protected endpoints. Tests verify endpoints exist and respond correctly.

### Issue: CloudFront takes too long to deploy

**Solution:**
Initial CloudFront deployment takes 15-20 minutes. Check status:

```bash
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID
```

### Issue: API calls fail with CORS errors

**Solution:**
Update CORS configuration:

```bash
ts-node infrastructure/configure-s3-cors.ts
```

## Manual Testing Checklist

After deployment, manually test:

- [ ] Access CloudFront URL via HTTPS
- [ ] Login with test credentials
- [ ] Create a new product
- [ ] Save a draft
- [ ] Generate QR code
- [ ] Test AI autofill
- [ ] Scan QR code (mobile)
- [ ] View sustainability badge
- [ ] Check DynamoDB records in AWS Console

## Security Best Practices

1. **Never expose S3 bucket publicly**
   - Use CloudFront OAI only
   - Disable S3 website hosting

2. **Always use HTTPS**
   - API Gateway: HTTPS only
   - CloudFront: Redirect HTTP → HTTPS
   - No HTTP endpoints

3. **Secure API calls**
   - Use Cognito authentication
   - Validate JWT tokens
   - Implement rate limiting

4. **Monitor access**
   - Enable CloudFront logging
   - Set up CloudWatch alarms
   - Review access logs regularly

## Rollback Procedure

If deployment fails:

1. **Revert to previous CloudFront distribution**
   ```bash
   aws cloudfront update-distribution --id OLD_DIST_ID --enabled
   ```

2. **Restore S3 files**
   ```bash
   aws s3 sync s3://backup-bucket/ s3://gp-frontend-prod/
   ```

3. **Invalidate cache**
   ```bash
   aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
   ```

## Performance Optimization

### CloudFront Caching
- HTML: No cache (always fresh)
- CSS/JS: 1 year cache (immutable)
- Images: 1 year cache
- Fonts: 1 year cache

### Compression
- Gzip enabled for text files
- Brotli compression for modern browsers

### HTTP/2 and HTTP/3
- Enabled by default on CloudFront
- Improves performance for multiple assets

## Cost Estimation

| Service | Monthly Cost (estimate) |
|---------|------------------------|
| S3 Storage (1GB) | $0.023 |
| CloudFront (10GB transfer) | $0.85 |
| API Gateway (1M requests) | $3.50 |
| DynamoDB (on-demand) | $1.25 |
| **Total** | **~$5.60/month** |

## Support

For issues or questions:
1. Check AWS CloudWatch logs
2. Review CloudFront access logs
3. Check API Gateway logs
4. Review this guide's troubleshooting section

## Next Steps

After successful deployment:

1. **Set up custom domain** (optional)
   - Request ACM certificate
   - Configure Route 53
   - Update CloudFront distribution

2. **Enable monitoring**
   ```bash
   ts-node infrastructure/setup-cloudwatch-alarms.ts
   ```

3. **Configure CI/CD** (optional)
   - Set up GitHub Actions
   - Automate deployments
   - Run tests on every commit

## Additional Resources

- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [API Gateway HTTPS](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
