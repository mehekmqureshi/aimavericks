# AI Generation Network Error - Diagnostic & Fix Guide

## Problem Summary
AI button triggers: "AI generation failed: Network Error"

## Root Cause Analysis

### Current Configuration
- **Frontend API URL**: `https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod`
- **Frontend Endpoint Call**: `POST /ai/generate`
- **Lambda Function**: `gp-aiGenerate-dev`
- **API Gateway Route**: `/ai/generate` (configured in deploy-api-gateway.ts)

### Likely Issues

1. **API Gateway Endpoint Mismatch**
   - Frontend is configured with API ID: `325xzv9pli`
   - Need to verify this API Gateway exists and has the `/ai/generate` route deployed

2. **CORS Configuration**
   - Lambda returns CORS headers, but API Gateway must also be configured
   - OPTIONS preflight may be failing

3. **Lambda IAM Permissions**
   - Lambda needs Bedrock access via IAM role
   - Role: `gp-aiGenerate-role-dev` must have `bedrock:InvokeModel` permission

4. **Authentication Issues**
   - Endpoint requires Cognito JWT token
   - Token may be missing or invalid in Authorization header

## Diagnostic Steps

### Step 1: Verify API Gateway Exists
```bash
aws apigateway get-rest-apis --region us-east-1 --query "items[?id=='325xzv9pli']"
```

### Step 2: Check API Gateway Routes
```bash
aws apigateway get-resources --rest-api-id 325xzv9pli --region us-east-1
```

### Step 3: Test Endpoint Directly (Without Auth)
```bash
curl -X OPTIONS https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod/ai/generate \
  -H "Origin: http://localhost:5173" \
  -v
```

### Step 4: Check Lambda Function
```bash
aws lambda get-function --function-name gp-aiGenerate-dev --region us-east-1
```

### Step 5: Verify Lambda IAM Role
```bash
aws iam get-role --role-name gp-aiGenerate-role-dev
aws iam list-attached-role-policies --role-name gp-aiGenerate-role-dev
```

### Step 6: Test Lambda Directly
```bash
aws lambda invoke \
  --function-name gp-aiGenerate-dev \
  --region us-east-1 \
  --payload '{"body":"{\"productName\":\"Test Shirt\",\"category\":\"Apparel\"}","requestContext":{"authorizer":{"claims":{"sub":"test-manufacturer-id"}},"requestId":"test-123"}}' \
  response.json

cat response.json
```

## Fix Procedures

### Fix 1: Verify/Update API Gateway Configuration

If API Gateway doesn't exist or is misconfigured:

```bash
# Run the API Gateway deployment script
cd infrastructure
npx ts-node deploy-api-gateway.ts
```

This will:
- Create REST API with ID
- Configure `/ai/generate` route
- Set up CORS
- Connect to Lambda
- Output the correct API endpoint URL

**Then update frontend/.env with the new URL**

### Fix 2: Ensure Lambda Has Bedrock Permissions

Create/update IAM policy for Lambda:

```bash
# Create policy document
cat > bedrock-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0"
      ]
    }
  ]
}
EOF

# Attach to Lambda role
aws iam put-role-policy \
  --role-name gp-aiGenerate-role-dev \
  --policy-name BedrockAccess \
  --policy-document file://bedrock-policy.json
```

### Fix 3: Enable CORS on API Gateway

If CORS is not working:

```bash
# Get the API ID
API_ID="325xzv9pli"

# Get the resource ID for /ai/generate
RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region us-east-1 \
  --query "items[?path=='/ai/generate'].id" \
  --output text)

# Add OPTIONS method for CORS
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region us-east-1

# Add mock integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
  --region us-east-1

# Add method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters \
    'method.response.header.Access-Control-Allow-Origin=true' \
    'method.response.header.Access-Control-Allow-Headers=true' \
    'method.response.header.Access-Control-Allow-Methods=true' \
  --region us-east-1

# Add integration response
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters \
    "method.response.header.Access-Control-Allow-Origin='*'" \
    "method.response.header.Access-Control-Allow-Headers='Content-Type,Authorization'" \
    "method.response.header.Access-Control-Allow-Methods='POST,OPTIONS'" \
  --region us-east-1

# Deploy changes
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region us-east-1
```

### Fix 4: Verify Frontend Configuration

Check `frontend/.env`:
```env
VITE_API_GATEWAY_URL=https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=us-east-1_QQ4WSYNbX
VITE_COGNITO_CLIENT_ID=2md6sb5g5k31i4ejgr0tlvqq49
VITE_COGNITO_REGION=us-east-1
```

Rebuild frontend after any .env changes:
```bash
cd frontend
npm run build
```

### Fix 5: Test Authentication Flow

Ensure user is logged in and token is being sent:

1. Open browser DevTools → Network tab
2. Click AI Autofill button
3. Check the request:
   - URL should be: `https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod/ai/generate`
   - Headers should include: `Authorization: Bearer <token>`
   - Request body should have: `{"productName":"...","category":"..."}`

## Quick Fix Script

Create and run this test script:

```bash
#!/bin/bash
# test-ai-endpoint.sh

API_URL="https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod"
TOKEN="<your-jwt-token-here>"

echo "Testing AI Generate Endpoint..."
echo ""

# Test OPTIONS (CORS preflight)
echo "1. Testing CORS preflight..."
curl -X OPTIONS "$API_URL/ai/generate" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -v

echo ""
echo ""

# Test POST (actual request)
echo "2. Testing POST request..."
curl -X POST "$API_URL/ai/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productName":"Organic Cotton T-Shirt","category":"Apparel"}' \
  -v
```

## Expected Responses

### Successful Response
```json
{
  "generatedContent": "This organic cotton t-shirt combines comfort with sustainability...",
  "timestamp": "2026-03-05T10:30:00.000Z"
}
```

### Error Responses

**401 Unauthorized**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication token"
  }
}
```
→ Fix: Ensure user is logged in and token is valid

**403 Forbidden**
```json
{
  "message": "User is not authorized to access this resource"
}
```
→ Fix: Check Cognito authorizer configuration

**500 Internal Error**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An error occurred while generating content"
  }
}
```
→ Fix: Check Lambda logs and Bedrock permissions

**Network Error (in browser)**
→ Fix: CORS issue or wrong API URL

## Monitoring & Logs

### Check Lambda Logs
```bash
aws logs tail /aws/lambda/gp-aiGenerate-dev --follow --region us-east-1
```

### Check API Gateway Logs
```bash
# Enable logging first
aws apigateway update-stage \
  --rest-api-id 325xzv9pli \
  --stage-name prod \
  --patch-operations \
    op=replace,path=/accessLogSettings/destinationArn,value=arn:aws:logs:us-east-1:565164711676:log-group:api-gateway-logs \
    op=replace,path=/*/*/logging/loglevel,value=INFO \
  --region us-east-1

# View logs
aws logs tail /aws/apigateway/325xzv9pli/prod --follow --region us-east-1
```

## Next Steps After Fix

1. Test the endpoint using curl or Postman
2. Verify CORS headers are present
3. Test from frontend with valid authentication
4. Monitor Lambda execution and Bedrock calls
5. Check CloudWatch metrics for errors

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Network Error" | Check API URL, CORS, and network connectivity |
| "401 Unauthorized" | Verify Cognito token is being sent |
| "403 Forbidden" | Check API Gateway authorizer configuration |
| "504 Timeout" | Increase Lambda timeout or optimize Bedrock call |
| "AccessDeniedException" | Add Bedrock permissions to Lambda IAM role |
| Empty response | Check Lambda is returning proper JSON format |

## Contact Points

- **API Gateway ID**: 325xzv9pli
- **Lambda Function**: gp-aiGenerate-dev
- **Region**: us-east-1
- **Cognito Pool**: us-east-1_QQ4WSYNbX
- **Model**: anthropic.claude-haiku-4-5-20251001-v1:0
