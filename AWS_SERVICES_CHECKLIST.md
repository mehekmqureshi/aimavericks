# AWS Services Validation Checklist

Use this checklist to ensure all AWS services are properly configured and operational.

## Pre-Validation Setup

- [ ] `.env` file exists and is configured
- [ ] AWS credentials are set (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- [ ] AWS_REGION is set correctly
- [ ] All required environment variables are populated

## Quick Validation (30 seconds)

```bash
npm run validate:quick
```

Checks:
- [ ] Bedrock connectivity
- [ ] DynamoDB table exists
- [ ] S3 bucket accessible
- [ ] Lambda function deployed

## Full Validation (2-3 minutes)

```bash
npm run validate:services
```

### Bedrock
- [ ] Connection established
- [ ] Model invocation successful
- [ ] IAM permissions verified
- [ ] Response received and parsed

### SageMaker
- [ ] Endpoint exists
- [ ] Endpoint status is `InService`
- [ ] Model invocation successful
- [ ] Prediction response valid

### Lambda Functions
- [ ] `createProduct` - exists and has concurrency
- [ ] `getProduct` - exists and has concurrency
- [ ] `listProducts` - exists and has concurrency
- [ ] `updateProduct` - exists and has concurrency
- [ ] `aiGenerate` - exists and has concurrency
- [ ] `calculateEmission` - exists and has concurrency
- [ ] `generateQR` - exists and has concurrency
- [ ] `verifySerial` - exists and has concurrency

### DynamoDB Tables
- [ ] `Products` - write test passed
- [ ] `Products` - read test passed
- [ ] `Manufacturers` - write test passed
- [ ] `Manufacturers` - read test passed
- [ ] `ProductSerials` - write test passed
- [ ] `ProductSerials` - read test passed

### S3 Buckets
- [ ] QR codes bucket - exists
- [ ] QR codes bucket - write test passed
- [ ] QR codes bucket - read test passed
- [ ] Frontend bucket - exists
- [ ] Frontend bucket - write test passed
- [ ] Frontend bucket - read test passed

### Cognito
- [ ] User pool configured
- [ ] Client ID configured
- [ ] Test user creation successful
- [ ] Authentication flow successful
- [ ] Token generation successful

## Auto-Repair

If any checks fail, run auto-repair:

```bash
# Repair specific service
npm run repair:services Lambda

# Repair all services
npm run repair:services all
```

### Repair Actions
- [ ] Bedrock - IAM permissions verified
- [ ] SageMaker - Endpoint provisioned
- [ ] Lambda - Functions deployed with concurrency
- [ ] DynamoDB - Tables created
- [ ] S3 - Buckets created with permissions
- [ ] Cognito - User pool and client configured

## Manual Verification

### Test Bedrock
```bash
cd infrastructure
npx tsx test-bedrock-generation.ts
```
- [ ] AI generation works
- [ ] Response is coherent
- [ ] No rate limiting errors

### Test SageMaker
```bash
cd infrastructure
npx tsx test-sagemaker-endpoint.ts
```
- [ ] Endpoint responds
- [ ] Predictions are reasonable
- [ ] Latency is acceptable (<500ms)

### Test API Gateway
```bash
cd infrastructure
npx tsx test-api.ts
```
- [ ] All endpoints respond
- [ ] Authentication works
- [ ] CORS headers present

### Test Complete Flow
```bash
cd infrastructure
npx tsx test-all-components.ts
```
- [ ] Create product works
- [ ] Get product works
- [ ] List products works
- [ ] Update product works
- [ ] QR generation works
- [ ] Serial verification works

## Deployment Validation

After deployment, verify:

```bash
npm run deploy:complete
npm run validate:services
```

- [ ] All services pass validation
- [ ] No auto-repairs needed
- [ ] Frontend accessible
- [ ] API Gateway responding
- [ ] CloudFront distribution active

## Monitoring Setup

### CloudWatch Alarms
```bash
cd infrastructure
npx tsx setup-cloudwatch-alarms.ts
```

- [ ] Lambda error alarms configured
- [ ] DynamoDB throttle alarms configured
- [ ] S3 access alarms configured
- [ ] API Gateway 5xx alarms configured

### Logs
- [ ] Lambda logs streaming to CloudWatch
- [ ] API Gateway logs enabled
- [ ] CloudFront logs configured
- [ ] DynamoDB streams enabled (if needed)

## Security Checklist

### IAM Roles
- [ ] Lambda execution role has minimal permissions
- [ ] SageMaker role has S3 access only
- [ ] API Gateway has Lambda invoke permissions
- [ ] CloudFront has S3 read permissions

### S3 Buckets
- [ ] Public access blocked (except frontend)
- [ ] Encryption enabled
- [ ] Versioning enabled
- [ ] Lifecycle policies configured
- [ ] CORS configured correctly

### Cognito
- [ ] Password policy enforced
- [ ] MFA available
- [ ] User pool domain configured
- [ ] OAuth flows configured

### API Gateway
- [ ] Throttling configured
- [ ] API keys required (if applicable)
- [ ] CORS configured
- [ ] Request validation enabled

## Performance Checklist

### Lambda
- [ ] Memory allocation optimized
- [ ] Timeout configured appropriately
- [ ] Reserved concurrency set
- [ ] Cold start minimized

### DynamoDB
- [ ] On-demand or provisioned capacity set
- [ ] Auto-scaling configured (if provisioned)
- [ ] GSI/LSI optimized
- [ ] TTL configured (if needed)

### S3
- [ ] Transfer acceleration enabled (if needed)
- [ ] CloudFront distribution configured
- [ ] Caching headers set
- [ ] Compression enabled

### SageMaker
- [ ] Instance type appropriate for load
- [ ] Auto-scaling configured
- [ ] Model optimization applied
- [ ] Endpoint monitoring enabled

## Cost Optimization

- [ ] Lambda memory right-sized
- [ ] DynamoDB on-demand vs provisioned evaluated
- [ ] S3 lifecycle policies configured
- [ ] CloudFront caching optimized
- [ ] SageMaker instance type optimized
- [ ] Unused resources cleaned up

## Troubleshooting

### If Validation Fails

1. **Check AWS Console**
   - Verify resources exist
   - Check CloudWatch logs
   - Review IAM permissions

2. **Run Diagnostics**
   ```bash
   cd infrastructure
   npx tsx verify-deployment.ts
   ```

3. **Check Environment**
   ```bash
   cat .env | grep -v "^#"
   ```

4. **Verify Credentials**
   ```bash
   aws sts get-caller-identity
   ```

5. **Review Logs**
   ```bash
   aws logs tail /aws/lambda/createProduct --follow
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| AccessDenied | Check IAM permissions |
| ResourceNotFound | Run provision scripts |
| ThrottlingException | Increase limits or add retry logic |
| ValidationException | Check input parameters |
| ServiceUnavailable | Check AWS service health |

## Sign-Off

After completing all checks:

- [ ] All validation checks pass
- [ ] No manual repairs needed
- [ ] Monitoring configured
- [ ] Security verified
- [ ] Performance acceptable
- [ ] Costs reviewed

**Validated By**: _________________
**Date**: _________________
**Environment**: [ ] Dev [ ] Staging [ ] Production

---

**Next Steps**: 
1. Run validation: `npm run validate:services`
2. Fix any issues: `npm run repair:services all`
3. Deploy: `npm run deploy:complete`
4. Verify: `npm run validate:services`
5. Monitor: Check CloudWatch dashboards
