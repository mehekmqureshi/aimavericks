# API Gateway Setup Guide

This guide provides instructions for provisioning and configuring the AWS API Gateway REST API for the Green Passport platform.

## Overview

The API Gateway serves as the entry point for all backend services, providing:
- RESTful API endpoints for all Lambda functions
- JWT-based authentication via Cognito User Pool
- CORS configuration for cross-origin requests
- Rate limiting (100 req/s, burst 200)
- Integration with 10 Lambda functions

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Node.js and TypeScript** installed
3. **AWS SDK for JavaScript v3** installed
4. **Cognito User Pool** provisioned (see `provision-cognito.ts`)
5. **Lambda functions** deployed with ARNs available
6. **IAM permissions** to create API Gateway resources

## Installation

Install required dependencies:

```bash
npm install @aws-sdk/client-api-gateway
```

## Configuration

Set the following environment variables before running the provisioning script:

```bash
# Required
export AWS_REGION="us-east-1"
export ENVIRONMENT="dev"
export COGNITO_USER_POOL_ARN="arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_ABC123"

# Lambda Function ARNs
export LAMBDA_CREATE_PRODUCT_ARN="arn:aws:lambda:us-east-1:123456789012:function:createProduct"
export LAMBDA_LIST_PRODUCTS_ARN="arn:aws:lambda:us-east-1:123456789012:function:listProducts"
export LAMBDA_GET_PRODUCT_ARN="arn:aws:lambda:us-east-1:123456789012:function:getProduct"
export LAMBDA_UPDATE_PRODUCT_ARN="arn:aws:lambda:us-east-1:123456789012:function:updateProduct"
export LAMBDA_GENERATE_QR_ARN="arn:aws:lambda:us-east-1:123456789012:function:generateQR"
export LAMBDA_VERIFY_SERIAL_ARN="arn:aws:lambda:us-east-1:123456789012:function:verifySerial"
export LAMBDA_AI_GENERATE_ARN="arn:aws:lambda:us-east-1:123456789012:function:aiGenerate"
export LAMBDA_CALCULATE_EMISSION_ARN="arn:aws:lambda:us-east-1:123456789012:function:calculateEmission"
export LAMBDA_SAVE_DRAFT_ARN="arn:aws:lambda:us-east-1:123456789012:function:saveDraft"
export LAMBDA_GET_DRAFT_ARN="arn:aws:lambda:us-east-1:123456789012:function:getDraft"

# Optional
export CORS_ORIGINS="https://example.cloudfront.net,https://app.example.com"
```

## Running the Provisioning Script

### TypeScript Execution

```bash
npx ts-node infrastructure/provision-apigateway.ts
```

### Compiled JavaScript

```bash
tsc infrastructure/provision-apigateway.ts
node infrastructure/provision-apigateway.js
```

## API Routes

The following routes are created:

### Product Management (Protected)

| Method | Path | Lambda | Auth Required |
|--------|------|--------|---------------|
| POST | /products | createProduct | ✅ Yes |
| GET | /products | listProducts | ✅ Yes |
| GET | /products/{productId} | getProduct | ❌ No |
| PUT | /products/{productId} | updateProduct | ✅ Yes |

### QR Code Management (Protected)

| Method | Path | Lambda | Auth Required |
|--------|------|--------|---------------|
| POST | /qr/generate | generateQR | ✅ Yes |

### Verification (Public)

| Method | Path | Lambda | Auth Required |
|--------|------|--------|---------------|
| GET | /verify/{serialId} | verifySerial | ❌ No |

### AI Services (Protected)

| Method | Path | Lambda | Auth Required |
|--------|------|--------|---------------|
| POST | /ai/generate | aiGenerate | ✅ Yes |

### Real-Time Calculation (Protected)

| Method | Path | Lambda | Auth Required |
|--------|------|--------|---------------|
| POST | /calculate/emission | calculateEmission | ✅ Yes |

### Draft Management (Protected)

| Method | Path | Lambda | Auth Required |
|--------|------|--------|---------------|
| POST | /drafts | saveDraft | ✅ Yes |
| GET | /drafts/{draftId} | getDraft | ✅ Yes |

## CORS Configuration

All routes include CORS support with the following configuration:

- **Allowed Origins**: Configurable via `CORS_ORIGINS` environment variable
- **Allowed Methods**: GET, POST, PUT, OPTIONS
- **Allowed Headers**: Authorization, Content-Type
- **Preflight**: OPTIONS method configured for all routes

## Rate Limiting

The API Gateway is configured with the following rate limits:

- **Rate Limit**: 100 requests per second per IP
- **Burst Limit**: 200 requests

These limits apply to the entire API and can be adjusted in the `UpdateStageCommand` configuration.

## JWT Authorization

Protected routes use a Cognito User Pool authorizer:

- **Type**: COGNITO_USER_POOLS
- **Identity Source**: Authorization header
- **Token Validation**: Automatic via API Gateway
- **Token Format**: `Bearer <JWT_TOKEN>`

### Example Request with Authorization

```bash
curl -X POST https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Product Name", "lifecycleData": {...}}'
```

## Lambda Permissions

After provisioning the API Gateway, grant it permission to invoke each Lambda function:

```bash
# For each Lambda function
aws lambda add-permission \
  --function-name createProduct \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:abc123xyz/*"
```

Or use the bulk script:

```bash
#!/bin/bash

API_ARN="arn:aws:execute-api:us-east-1:123456789012:abc123xyz"
FUNCTIONS=(
  "createProduct"
  "listProducts"
  "getProduct"
  "updateProduct"
  "generateQR"
  "verifySerial"
  "aiGenerate"
  "calculateEmission"
  "saveDraft"
  "getDraft"
)

for FUNCTION in "${FUNCTIONS[@]}"; do
  echo "Granting permission to $FUNCTION"
  aws lambda add-permission \
    --function-name "$FUNCTION" \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "${API_ARN}/*"
done

echo "All permissions granted!"
```

## Testing the API

### Test Public Endpoint (No Auth)

```bash
# Get product by ID
curl https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/products/PROD001

# Verify serial
curl https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/verify/PROD001-0001
```

### Test Protected Endpoint (With Auth)

```bash
# First, get a JWT token from Cognito
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id YOUR_APP_CLIENT_ID \
  --auth-parameters USERNAME=user@example.com,PASSWORD=YourPassword123! \
  --query 'AuthenticationResult.AccessToken' \
  --output text)

# Create a product
curl -X POST https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "Test Description",
    "category": "Textiles",
    "lifecycleData": {
      "materials": [...],
      "manufacturing": {...},
      "packaging": {...},
      "transport": {...},
      "usage": {...},
      "endOfLife": {...}
    }
  }'
```

### Test CORS Preflight

```bash
curl -X OPTIONS https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/products \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -v
```

## Monitoring and Logging

### CloudWatch Logs

API Gateway automatically logs to CloudWatch. View logs:

```bash
aws logs tail /aws/apigateway/green-passport-api-dev --follow
```

### CloudWatch Metrics

Monitor API performance:

```bash
# Get API call count
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=green-passport-api-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum

# Get 4XX errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 4XXError \
  --dimensions Name=ApiName,Value=green-passport-api-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Updating the API

To update routes or configuration:

1. Modify the `provision-apigateway.ts` script
2. Re-run the provisioning script
3. Create a new deployment:

```bash
aws apigateway create-deployment \
  --rest-api-id abc123xyz \
  --stage-name prod \
  --description "Updated configuration"
```

## Troubleshooting

### Issue: 403 Forbidden on Protected Routes

**Solution**: Verify JWT token is valid and not expired. Check Cognito User Pool ARN is correct.

```bash
# Decode JWT token to check expiration
echo $TOKEN | cut -d. -f2 | base64 -d | jq .
```

### Issue: 502 Bad Gateway

**Solution**: Check Lambda function permissions and ensure API Gateway can invoke them.

```bash
# Test Lambda function directly
aws lambda invoke \
  --function-name createProduct \
  --payload '{"body": "{}"}' \
  response.json
```

### Issue: CORS Errors

**Solution**: Verify CORS configuration and ensure OPTIONS method is configured.

```bash
# Check OPTIONS method exists
aws apigateway get-method \
  --rest-api-id abc123xyz \
  --resource-id xyz789 \
  --http-method OPTIONS
```

### Issue: Rate Limit Exceeded (429)

**Solution**: Increase rate limits or implement client-side retry logic with exponential backoff.

```bash
# Update rate limits
aws apigateway update-stage \
  --rest-api-id abc123xyz \
  --stage-name prod \
  --patch-operations \
    op=replace,path=/throttle/rateLimit,value=200 \
    op=replace,path=/throttle/burstLimit,value=400
```

## Security Best Practices

1. **Use Specific CORS Origins**: Avoid wildcard (`*`) in production
2. **Enable CloudWatch Logging**: Monitor all API requests
3. **Implement Request Validation**: Add request validators for input validation
4. **Use API Keys**: For additional rate limiting per client
5. **Enable AWS WAF**: Protect against common web exploits
6. **Rotate Credentials**: Regularly rotate Cognito app client secrets
7. **Monitor Metrics**: Set up CloudWatch alarms for errors and latency

## Cost Optimization

- **Use Caching**: Enable API Gateway caching for GET requests
- **Optimize Lambda**: Reduce Lambda execution time to minimize costs
- **Monitor Usage**: Track API calls and optimize frequently called endpoints
- **Use Regional Endpoints**: Avoid edge-optimized endpoints if not needed globally

## Requirements Mapping

- **Requirement 20.1**: API Gateway routing to Lambda functions ✅
- **Requirement 20.2**: CORS configuration ✅
- **Requirement 20.3**: JWT token validation ✅
- **Requirement 20.5**: Rate limiting (100 req/s, burst 200) ✅
- **Requirement 1.3**: JWT authentication via Cognito ✅
- **Requirement 3.1.6**: Draft endpoints for save/restore ✅
- **Requirement 27.1**: Infrastructure provisioning via script ✅

## Next Steps

1. ✅ Provision API Gateway
2. Grant Lambda invoke permissions
3. Update CloudFront distribution with API endpoint
4. Configure custom domain name (optional)
5. Set up CloudWatch alarms
6. Implement API documentation (Swagger/OpenAPI)
7. Test all endpoints with integration tests

## Support

For issues or questions:
- Check CloudWatch Logs for detailed error messages
- Review Lambda function logs
- Verify IAM permissions
- Consult AWS API Gateway documentation
