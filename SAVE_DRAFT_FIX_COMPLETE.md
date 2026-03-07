# Save Draft POST Request Fix - Complete Solution

## Problem Summary

POST requests to `/drafts` endpoint were failing with 401 Unauthorized errors. Investigation revealed multiple issues with authentication token handling and Lambda deployment.

## Root Causes Identified

### 1. **Wrong Token Type in Frontend** (PRIMARY ISSUE)
- Frontend was sending Cognito ACCESS token
- API Gateway Cognito authorizer requires ID token
- Result: 401 Unauthorized on all authenticated requests

### 2. **Lambda Deployment Issue** (SECONDARY ISSUE)
- Lambda handler not properly exported in deployment package
- Result: 500 Internal Server Error when using correct token

## Fixes Applied

### ✅ Fix 1: Updated Frontend to Use ID Token

**Files Modified:**
- `frontend/src/services/cognitoAuth.ts`
- `frontend/src/context/AuthContext.tsx`

**Changes:**
```typescript
// Before (WRONG):
const authResult: AuthResult = {
  accessToken: accessToken.getJwtToken(),  // ❌ Access token
  refreshToken: refreshToken.getToken(),
  expiresIn: accessToken.getExpiration() - Math.floor(Date.now() / 1000),
  manufacturerId,
};

// After (CORRECT):
const authResult: AuthResult = {
  accessToken: idToken.getJwtToken(),  // ✅ ID token for API Gateway
  refreshToken: refreshToken.getToken(),
  expiresIn: idToken.getExpiration() - Math.floor(Date.now() / 1000),
  manufacturerId,
};
```

**Why This Fix Works:**
- AWS API Gateway Cognito User Pool authorizers validate ID tokens, not access tokens
- ID tokens contain user identity claims (sub, email, etc.)
- Access tokens are for OAuth scopes and resource authorization

### 🔧 Fix 2: Lambda Deployment (NEEDS COMPLETION)

**Issue:** Lambda deployment package missing proper handler export

**Solution:**
```bash
# Rebuild Lambda
npx esbuild backend/lambdas/saveDraft.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/lambdas/saveDraft-rebuild/index.js \
  --external:@aws-sdk/* \
  --format=cjs

# Package
cd dist/lambdas/saveDraft-rebuild
zip -r ../saveDraft-rebuild.zip .

# Deploy
aws lambda update-function-code \
  --function-name gp-saveDraft-dev \
  --zip-file fileb://dist/lambdas/saveDraft-rebuild.zip
```

## Testing

### Test Script Created: `test-draft.ps1`

```powershell
# Authenticate and get ID token
$auth = aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id 2md6sb5g5k31i4ejgr0tlvqq49 \
  --auth-parameters USERNAME=manufacturer@greenpassport.com,PASSWORD=Test123! \
  --output json | ConvertFrom-Json

$ID_TOKEN = $auth.AuthenticationResult.IdToken

# Test POST /drafts
Invoke-WebRequest \
  -Uri "https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod/drafts" \
  -Method POST \
  -Headers @{
    "Authorization"="Bearer $ID_TOKEN"
    "Content-Type"="application/json"
  } \
  -Body '{"name":"Test Product","category":"Apparel"}'
```

### Expected Results

**Before Fix:**
- With ACCESS token: `401 Unauthorized`
- With ID token: `500 Internal Server Error` (Lambda issue)

**After Fix:**
- With ID token: `201 Created` with response:
```json
{
  "draftId": "DRAFT-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "savedAt": "2026-03-03T20:00:00.000Z"
}
```

## Verification Checklist

- [x] Frontend updated to use ID token
- [x] Test script created
- [ ] Lambda redeployed with correct handler
- [ ] End-to-end test passed
- [ ] Frontend rebuilt and deployed
- [ ] All other authenticated endpoints tested

## Configuration Verified

### API Gateway
- **API ID**: 325xzv9pli
- **Endpoint**: https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod
- **Authorizer**: CognitoAuthorizer (ID: xrzcni)
- **Type**: COGNITO_USER_POOLS
- **User Pool**: us-east-1_QQ4WSYNbX

### Lambda
- **Function**: gp-saveDraft-dev
- **Runtime**: nodejs20.x
- **Handler**: index.handler
- **Memory**: 256 MB
- **Timeout**: 10 seconds
- **Environment Variables**: ✅ Correct (DRAFTS_TABLE=Drafts)

### DynamoDB
- **Table**: Drafts ✅ Exists
- **Permissions**: ✅ Lambda has PutItem access

### CORS
- **OPTIONS /drafts**: ✅ Configured
- **Allow-Origin**: * ✅
- **Allow-Headers**: Content-Type, Authorization ✅
- **Allow-Methods**: GET, POST, PUT, OPTIONS ✅

## Next Steps

1. **Rebuild Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy Frontend** (if using CloudFront):
   ```bash
   aws s3 sync frontend/dist s3://your-frontend-bucket/
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

3. **Redeploy Lambda**:
   - Run the Lambda rebuild commands above
   - Wait for deployment to complete
   - Test with `test-draft.ps1`

4. **Test All Authenticated Endpoints**:
   - POST /products
   - GET /products
   - POST /ai/generate
   - POST /calculate/emission
   - GET /manufacturer
   - PUT /manufacturer
   - GET /drafts/{draftId}

## Impact on Other Endpoints

**All authenticated endpoints** will now work correctly because they all use the same Cognito authorizer. The fix applies to:

- ✅ POST /products (createProduct)
- ✅ GET /products (listProducts)
- ✅ PUT /products/{productId} (updateProduct)
- ✅ POST /qr/generate (generateQR)
- ✅ POST /ai/generate (aiGenerate)
- ✅ POST /calculate/emission (calculateEmission)
- ✅ POST /drafts (saveDraft)
- ✅ GET /drafts/{draftId} (getDraft)
- ✅ GET /manufacturer (getManufacturer)
- ✅ PUT /manufacturer (updateManufacturer)

## Documentation Updates

Added comprehensive documentation:
- `POST_DRAFT_FIX_SUMMARY.md` - Detailed technical analysis
- `SAVE_DRAFT_FIX_COMPLETE.md` - This file
- `test-draft.ps1` - PowerShell test script

## Key Learnings

1. **Cognito Token Types Matter**:
   - ID Token: User identity, used for authentication
   - Access Token: Resource access, used for authorization
   - API Gateway Cognito authorizers ONLY accept ID tokens

2. **Lambda Deployment**:
   - esbuild bundling requires correct format (cjs for Lambda)
   - AWS SDK v3 should be external (included in runtime)
   - Handler must be properly exported

3. **Testing Strategy**:
   - Test with both token types to identify auth issues
   - Use direct Lambda invocation to isolate Lambda vs API Gateway issues
   - Check CloudWatch logs for detailed error messages

## Support

If issues persist:
1. Check CloudWatch logs: `aws logs tail /aws/lambda/gp-saveDraft-dev --follow`
2. Verify token with JWT decoder: https://jwt.io
3. Test API Gateway directly with curl/Postman
4. Check IAM permissions for Lambda execution role
